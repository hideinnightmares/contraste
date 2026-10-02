/**
 * Ejecuta el pipeline desde la terminal.
 *
 *   npm run pipeline                 → fuentes reales (src/config/sources.ts), sin redactor: llega
 *                                      hasta la verificación
 *   npm run pipeline -- --prueba     → fuentes de prueba (ítems ficticios, sin red)
 *   npm run pipeline -- --write      → además redacta con IA (Gemini si hay GEMINI_API_KEY en .env.pipeline)
 *   npm run pipeline -- --save       → guarda las notas y el informe en la base (Supabase) si hay
 *                                      SUPABASE_URL y SUPABASE_SECRET_KEY en .env.pipeline; si no,
 *                                      en .data/pipeline/ (publicadas o en revisión)
 *   npm run pipeline -- --save --permitir-demo
 *                                    → también guarda en la base las notas armadas con fuentes de
 *                                      prueba (quedan marcadas como demostración)
 *   npm run pipeline -- --detalle    → muestra también los hechos de una sola fuente
 *
 * Con CONTRASTE_MEMORIA (la ruta de un archivo, por ejemplo .cache/pipeline/memoria.json) recuerda
 * entre corridas los ítems de las últimas 24 horas, sin el texto de las notas (ver memory.ts).
 *
 * Redacta como mucho CONTRASTE_MAX_BORRADORES_POR_CORRIDA hechos (4 si no se define), los que
 * cubren más fuentes independientes; el resto queda para la próxima corrida.
 *
 * Antes de redactar, lee el texto completo de cada nota real (respeta robots.txt, muros de pago y
 * la marca noai; ver sources/article.ts). Las fuentes de prueba no se leen.
 *
 * Imprime un informe y lo guarda en .data/pipeline/informes/ (sin el texto de las notas ajenas).
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { DEFAULT_SINCE_HOURS, connectorsFor, runPipeline } from './run';
import { createWriter } from './writers';
import { FilePublisher, type Publisher } from './stages/publish';
import { WebArticleFetcher } from './sources/article';
import { SupabaseStore, supabaseFromEnv } from './storage/supabase';
import { withoutFeedText } from './report';
import { itemsToRemember, loadMemory, saveMemory } from './memory';
import type { ClusterOutcome } from './types';
import { demoSources } from '@/config/sources';
import { editorial } from '@/config/editorial';

// Las claves de los redactores viven en .env.pipeline, que el sitio nunca lee: si
// estuvieran en .env.local, el build de Cloudflare las metería en el código publicado.
// Las variables ya definidas (por ejemplo, secretos de GitHub Actions) tienen prioridad.
const pipelineEnv = path.join(process.cwd(), '.env.pipeline');
if (existsSync(pipelineEnv)) process.loadEnvFile(pipelineEnv);
// El resto de la configuración (modo de revisión, etc.) se lee igual que en Next.
loadEnvConfig(process.cwd());

const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const save = args.has('--save');
const allowDemo = args.has('--permitir-demo');
const demo = args.has('--prueba');
const detail = demo || args.has('--detalle');
// Las fuentes de prueba no se recuerdan: son ficticias y no cambian.
const memoryFile = demo ? null : process.env.CONTRASTE_MEMORIA?.trim() || null;

const DEFAULT_MAX_DRAFTS = 4;

const label = {
  auto_publish: 'PUBLICACIÓN AUTOMÁTICA',
  human_review: 'REVISIÓN HUMANA',
  hold: 'EN ESPERA',
} as const;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function maxDraftsFromEnv(): number {
  const raw = process.env.CONTRASTE_MAX_BORRADORES_POR_CORRIDA?.trim();
  if (!raw) return DEFAULT_MAX_DRAFTS;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`CONTRASTE_MAX_BORRADORES_POR_CORRIDA tiene que ser un número entero (0 o más), no "${raw}".`);
  }
  return value;
}

function printOutcome(o: ClusterOutcome) {
  const v = o.verification;
  console.log(`\n▸ ${o.cluster.headline}`);
  console.log(`  Sección: ${o.category ?? 'sin asignar'} · Etapa: ${o.stage}`);
  console.log(`  Verificación: ${v.status} (${v.confidence}), ${v.independentSources} fuente(s) independiente(s) de ${o.cluster.items.length} ítems`);
  for (const c of v.contradictions) console.log(`  ⚠ Contradicción: ${c.detail}`);
  if (o.grounding && !o.grounding.ok) console.log(`  ⚠ Control posterior a la redacción: ${JSON.stringify(o.grounding)}`);
  console.log(`  Decisión: ${label[o.review.decision]}`);
  for (const r of o.review.reasons) console.log(`    - ${r}`);
  if (o.draft) console.log(`  Borrador: "${o.draft.title}" (${o.draft.writer})`);
  if (o.savedAs) console.log(`  Guardado: ${o.savedAs}`);
}

async function main() {
  const maxDrafts = maxDraftsFromEnv();
  const writer = write ? createWriter() : null;
  const db = save ? supabaseFromEnv() : null;
  const store = db ? new SupabaseStore(db) : null;
  const destination = !save ? 'no guarda' : store ? 'base de datos' : 'archivos locales';
  console.log(
    `Contraste · pipeline (fuentes: ${demo ? 'de prueba' : 'reales'}, revisión: ${editorial.review.mode}, redactor: ${writer ? writer.name : 'ninguno'}, máximo por corrida: ${maxDrafts}, destino: ${destination})\n`,
  );

  let publisher: Publisher | null = null;
  if (store) {
    // Una nota armada con fuentes de prueba es ficticia: a la base solo entra si se pide.
    publisher = {
      save: async (article, meta) =>
        article.isDemo && !allowDemo ? 'no guardada: es de demostración (usá --permitir-demo)' : store.save(article, meta),
    };
  } else if (save) {
    publisher = new FilePublisher();
  }

  // Lee el texto completo de las notas reales (las fuentes de prueba no se leen). Si el proveedor
  // del redactor entrena con lo que recibe, también respeta lo que cada sitio le prohíbe a él.
  const fetcher = new WebArticleFetcher({ alsoRespect: writer?.optOutAgents ?? [], log: (m) => console.log(`  · ${m}`) });

  const memory = memoryFile ? await loadMemory(memoryFile) : null;
  if (memory?.warning) console.log(`  ! ${memory.warning}`);

  const report = await runPipeline({
    connectors: demo ? connectorsFor(demoSources) : undefined,
    previousItems: memory?.items,
    writer,
    fetcher,
    publisher,
    maxDrafts,
    takenSlugs: store ? await store.existingSlugs() : undefined,
    coveredSourceUrls: store ? await store.coveredSourceUrls() : undefined,
    log: (m) => console.log(`  · ${m}`),
  });

  console.log(`\n${report.collected} ítems recopilados, ${report.clusters} hechos detectados.`);
  for (const f of report.failedSources) console.log(`  ! Fuente ${f.sourceId}: ${f.error}`);

  // Con las fuentes reales hay cientos de hechos de una sola fuente: se cuentan, no se listan.
  const singleSource = (o: ClusterOutcome) => o.stage === 'verified' && o.verification.status === 'unverified';
  for (const o of report.outcomes) {
    if (o.stage === 'deferred' || o.stage === 'already_covered' || (singleSource(o) && !detail)) continue;
    printOutcome(o);
  }
  const deferred = report.outcomes.filter((o) => o.stage === 'deferred');
  if (deferred.length > 0) {
    console.log(`\nQuedan para una próxima corrida (${deferred.length}):`);
    for (const o of deferred) console.log(`  · ${o.cluster.headline} (${o.verification.independentSources} fuentes independientes)`);
  }
  const covered = report.outcomes.filter((o) => o.stage === 'already_covered').length;
  const waiting = report.outcomes.filter(singleSource).length;
  console.log(
    `\n${count(waiting, 'hecho', 'hechos')} con una sola fuente, en espera de confirmación. ${count(covered, 'ya cubierto', 'ya cubiertos')} por notas anteriores.`,
  );

  if (store) {
    const runId = await store.recordRun(report);
    console.log(`\nInforme guardado en la base (pipeline_runs ${runId}).`);
  }

  if (memoryFile) {
    const since = new Date(new Date(report.startedAt).getTime() - DEFAULT_SINCE_HOURS * 3_600_000);
    const items = itemsToRemember(report, since);
    await saveMemory(memoryFile, items);
    console.log(`\nMemoria para la próxima corrida: ${items.length} ítems en ${memoryFile}`);
  }

  const dir = path.join(process.cwd(), '.data', 'pipeline', 'informes');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${report.startedAt.replace(/[:.]/g, '-')}.json`);
  await writeFile(file, JSON.stringify(withoutFeedText(report), null, 2), 'utf8');
  console.log(`\nInforme guardado en ${path.relative(process.cwd(), file)}`);

  // Lo que necesita que alguien lo mire hace fallar la corrida, para que se vea en GitHub Actions.
  // Un redactor sin cupo no: en el plan gratis pasa, y el hecho se reintenta en la próxima.
  const problems: string[] = [];
  if (report.collected === 0 && report.failedSources.length > 0) problems.push('no respondió ninguna fuente');
  if (report.outcomes.some((o) => o.stage === 'writer_failed' && o.review.decision === 'human_review')) {
    problems.push('el redactor falló por algo que no se arregla solo (revisá la clave o el pedido)');
  }
  if (report.outcomes.some((o) => o.stage === 'save_failed')) problems.push('hubo borradores que no se pudieron guardar');
  if (problems.length > 0) {
    console.error(`\nAtención: ${problems.join('; ')}.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('El pipeline falló:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
