/**
 * Corre antes de `next build`. Con `CONTENT_SOURCE=database`, descarga de Supabase las notas
 * publicadas y las deja en la foto local que lee el sitio (src/data/snapshot.ts). Con
 * cualquier otra fuente no hace nada.
 *
 * Es incremental: primero pide el índice (id y fecha de cada nota publicada, pocos bytes) y
 * solo descarga el documento completo de las que son nuevas o cambiaron desde la foto
 * anterior. Así cada armado gasta muy poco de la transferencia del plan gratis.
 *
 * Usa la clave publicable (rol anon): por las reglas de la base solo ve notas publicadas con
 * fecha cumplida. Si la base no responde, el armado falla: publicar con una foto vieja podría
 * volver a mostrar una nota despublicada.
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import {
  SNAPSHOT_PATH,
  SNAPSHOT_VERSION,
  mergeSnapshot,
  readSnapshot,
  staleIds,
  type Snapshot,
  type SnapshotRow,
} from '../src/data/snapshot';
import type { Article } from '../src/domain/types';

loadEnvConfig(process.cwd());

const PAGE = 1000;
const CHUNK = 100;

async function main() {
  if ((process.env.CONTENT_SOURCE ?? 'demo') !== 'database') {
    console.log('Contenido: dataset de demostración (CONTENT_SOURCE no es "database"); no se consulta la base.');
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Con CONTENT_SOURCE=database hacen falta NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (en .env.production).');
  }
  if (!key.startsWith('sb_publishable_')) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tiene que ser la clave publicable (sb_publishable_...).');

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const index: { id: string; updatedAt: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('articles')
      .select('id, updated_at')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`No se pudo leer el índice de notas: ${error.message}`);
    index.push(...data.map((r) => ({ id: r.id as string, updatedAt: r.updated_at as string })));
    if (data.length < PAGE) break;
  }

  let previous: SnapshotRow[] = [];
  try {
    previous = readSnapshot()?.rows ?? [];
  } catch (error) {
    console.warn(`Contenido: la foto anterior no sirve y se descarga todo de nuevo (${(error as Error).message}).`);
  }

  const stale = staleIds(previous, index);
  const fetched: SnapshotRow[] = [];
  for (let i = 0; i < stale.length; i += CHUNK) {
    const ids = stale.slice(i, i + CHUNK);
    const { data, error } = await db.from('articles').select('id, updated_at, document').in('id', ids);
    if (error) throw new Error(`No se pudieron descargar las notas: ${error.message}`);
    fetched.push(...data.map((r) => ({ id: r.id as string, updatedAt: r.updated_at as string, document: r.document as Article })));
  }

  const rows = mergeSnapshot(previous, index, fetched);
  const snapshot: Snapshot = { version: SNAPSHOT_VERSION, syncedAt: new Date().toISOString(), rows };
  await mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
  const tmp = `${SNAPSHOT_PATH}.tmp`;
  await writeFile(tmp, JSON.stringify(snapshot), 'utf8');
  await rename(tmp, SNAPSHOT_PATH);

  const removed = previous.filter((p) => !index.some((r) => r.id === p.id)).length;
  console.log(
    `Contenido: ${rows.length} notas publicadas (${fetched.length} descargadas, ${rows.length - fetched.length} reutilizadas, ${removed} quitadas).`,
  );
}

main().catch((error: unknown) => {
  console.error('No se pudo descargar el contenido de la base:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
