import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Article } from '@/domain/types';

/**
 * Foto local de las notas publicadas en la base, para armar el sitio.
 *
 * `scripts/sync-content.ts` la descarga antes de `next build` y todas las páginas leen de
 * acá: la base se consulta una vez por armado (no una vez por página) y todas las páginas de
 * un armado ven exactamente las mismas notas. Entre armados se guarda en la caché de GitHub
 * Actions y solo se descargan las notas que cambiaron. Ver docs/BASE-DE-DATOS.md.
 */

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_PATH = path.join(process.cwd(), '.cache', 'contenido', 'notas.json');

export interface SnapshotRow {
  id: string;
  /** `updated_at` de la fila: si no cambió, la nota no se vuelve a descargar. */
  updatedAt: string;
  document: Article;
}

export interface Snapshot {
  version: number;
  syncedAt: string;
  rows: SnapshotRow[];
}

/**
 * Combina la foto anterior con el índice actual de la base (id y fecha de cada nota visible)
 * y las notas recién descargadas. Lo que ya no figura en el índice (despublicado o
 * descartado) se quita.
 */
export function mergeSnapshot(previous: SnapshotRow[], index: { id: string; updatedAt: string }[], fetched: SnapshotRow[]): SnapshotRow[] {
  const before = new Map(previous.map((r) => [r.id, r]));
  const fresh = new Map(fetched.map((r) => [r.id, r]));
  return index.map(({ id, updatedAt }) => {
    const row = fresh.get(id) ?? before.get(id);
    if (!row || row.updatedAt !== updatedAt) {
      throw new Error(`Falta descargar la nota ${id} (actualizada ${updatedAt}).`);
    }
    return row;
  });
}

/** Ids del índice que hay que descargar: nuevos o con otra fecha de actualización. */
export function staleIds(previous: SnapshotRow[], index: { id: string; updatedAt: string }[]): string[] {
  const before = new Map(previous.map((r) => [r.id, r.updatedAt]));
  return index.filter(({ id, updatedAt }) => before.get(id) !== updatedAt).map((r) => r.id);
}

/** La nota tal como la usa el sitio: el id es el de la fila en la base. */
export const toArticle = (row: SnapshotRow): Article => ({ ...row.document, id: row.id });

let cached: { file: string; mtimeMs: number; snapshot: Snapshot } | null = null;

/** Lee la foto (una vez por proceso mientras no cambie el archivo). `null` si no existe. */
export function readSnapshot(file = SNAPSHOT_PATH): Snapshot | null {
  let mtimeMs: number;
  try {
    mtimeMs = statSync(file).mtimeMs;
  } catch {
    return null;
  }
  if (cached && cached.file === file && cached.mtimeMs === mtimeMs) return cached.snapshot;
  const snapshot = JSON.parse(readFileSync(file, 'utf8')) as Snapshot;
  if (snapshot.version !== SNAPSHOT_VERSION) {
    throw new Error(`La foto de la base (${file}) tiene la versión ${snapshot.version} y se esperaba la ${SNAPSHOT_VERSION}.`);
  }
  cached = { file, mtimeMs, snapshot };
  return snapshot;
}
