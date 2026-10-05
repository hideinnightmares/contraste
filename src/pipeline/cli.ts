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
 *   npm run pipeline -- --verificar  → solo comprueba las claves (Gemini y la base), sin leer
 *                                      fuentes, redactar ni guardar (ver check.ts)
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
 * Con CONTRASTE_REGISTRO=resumen (lo usa GitHub Actions, donde el registro es público) imprime
 * solo cantidades y errores, sin títulos ni direcciones (ver registro.ts).
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
import { checkConfig } from './check';
import type { ClusterOutcome } from './types';
import { logLine, summaryFromEnv, summaryLines, type Log } from './registro';
import { demoSources, realSources } from '@/config/sources';
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
const summaryOnly = summaryFromEnv();
const line: Log = (message, extra) => console.log(`  · ${logLine(message, extra, summaryOnly)}`);
// Las fuentes de prueba no se recuerdan: son ficticias y no cambian.
const memoryFile = demo ? null : process.env.CONTRASTE_MEMORIA?.trim() || null;

const DEFAULT_MAX_DRAFTS = 4;
/**
 * Minutos después de los cuales no se empieza otro borrador. Una corrida normal tarda 2 o 3; el
 * tope acota los minutos de GitHub Actions cuando Gemini anda lento (ver docs/DESPLIEGUE.md).
 */
const DEFAULT_MAX_RUN_MINUTES = 4;

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

function maxRunMinutesFromEnv(): number {
  const raw = process.env.CONTRASTE_MINUTOS_POR_CORRIDA?.trim();
  if (!raw) return DEFAULT_MAX_RUN_MINUTES;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`CONTRASTE_MINUTOS_POR_CORRIDA tiene que ser un número entero de minutos (1 o más), no "${raw}".`);
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

async function verifyConfig() {
  console.log('Contraste · comprobación de las claves del pipeline (no lee fuentes, no redacta ni guarda)\n');
  const lines = await checkConfig(process.env);
  for (const line of lines) console.log(`${line.ok ? '✓' : '✗'} ${line.text}`);
  if (lines.some((line) => !line.ok)) {
    console.error('\nHay claves para revisar.');
    process.exitCode = 1;
  } else {
    console.log('\nTodo listo: el pipeline puede redactar y guardar.');
  }
}

async function main() {
  if (args.has('--verificar')) return verifyConfig();
  const maxDrafts = maxDraftsFromEnv();
  const maxRunMinutes = maxRunMinutesFromEnv();
  const writer = write ? createWriter({ log: line }) : null;
  const db = save ? supabaseFromEnv() : null;
  const store = db ? new SupabaseStore(db) : null;
  const destination = !save ? 'no guarda' : store ? 'base de datos' : 'archivos locales';
  console.log(
    `Contraste · pipeline (fuentes: ${demo ? 'de prueba' : 'reales'}, revisión: ${editorial.review.mode}, redactor: ${writer ? writer.name : 'ninguno'}, máximo por corrida: ${maxDrafts} borradores en ${maxRunMinutes} min, destino: ${destination})\n`,
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
  const fetcher = new WebArticleFetcher({ alsoRespect: writer?.optOutAgents ?? [], log: line });

  const memory = memoryFile ? await loadMemory(memoryFile) : null;
  if (memory?.warning) console.log(`  ! ${memory.warning}`);

  const connectors = connectorsFor(demo ? demoSources : realSources);
  const report = await runPipeline({
    connectors,
    previousItems: memory?.items,
    writer,
    fetcher,
    publisher,
    maxDrafts,
    maxRunMinutes,
    takenSlugs: store ? await store.existingSlugs() : undefined,
    coveredSourceUrls: store ? await store.coveredSourceUrls() : undefined,
    log: line,
  });

  console.log(`\n${report.collected} ítems recopilados, ${report.clusters} hechos detectados.`);
  for (const f of report.failedSources) console.log(`  ! Fuente ${f.sourceId}: ${f.error}`);

  // Con las fuentes reales hay cientos de hechos de una sola fuente: se cuentan, no se listan.
  const singleSource = (o: ClusterOutcome) => o.stage === 'verified' && o.verification.status === 'unverified';
  if (summaryOnly) {
    console.log('');
    for (const l of summaryLines(report)) console.log(l);
    console.log('El detalle de cada hecho está en el informe de la corrida, en la base: lo ve solo la redacción.');
  } else {
    for (const o of report.outcomes) {
      if (o.stage === 'deferred' || o.stage === 'already_covered' || (singleSource(o) && !detail)) continue;
      printOutcome(o);
    }
    const deferred = report.outcomes.filter((o) => o.stage === 'deferred');
    if (deferred.length > 0) {
      console.log(`\nQuedan para una próxima corrida (${deferred.length}):`);
      for (const o of deferred) console.log(`  · ${o.cluster.headline} (${o.verification.independentSources} fuentes independientes)`);
    }
  }
  const covered = report.outcomes.filter((o) => o.stage === 'already_covered').length;
  const waiting = report.outcomes.filter(singleSource).length;
  console.log(
    `\n${count(waiting, 'hecho', 'hechos')} con una sola fuente, en espera de confirmación. ${count(covered, 'ya cubierto', 'ya cubiertos')} por notas anteriores.`,
  );

  // Primero la memoria: no depende de la base.
  if (memoryFile) {
    const since = new Date(new Date(report.startedAt).getTime() - DEFAULT_SINCE_HOURS * 3_600_000);
    const items = itemsToRemember(report, since);
    await saveMemory(memoryFile, items);
    console.log(`\nMemoria para la próxima corrida: ${items.length} ítems en ${memoryFile}`);
  }

  if (store) {
    const runId = await store.recordRun(report);
    console.log(`\nInforme guardado en la base (pipeline_runs ${runId}).`);
  }

  const dir = path.join(process.cwd(), '.data', 'pipeline', 'informes');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${report.startedAt.replace(/[:.]/g, '-')}.json`);
  await writeFile(file, JSON.stringify(withoutFeedText(report), null, 2), 'utf8');
  console.log(`\nInforme guardado en ${path.relative(process.cwd(), file)}`);

  // Lo que necesita que alguien lo mire hace fallar la corrida, para que se vea en GitHub Actions.
  // Un redactor sin cupo no: en el plan gratis pasa, y el hecho se reintenta en la próxima.
  // Un pedido que el proveedor bloquea tampoco, si otros borradores salieron: es de esa nota.
  const problems: string[] = [];
  if (connectors.length > 0 && report.failedSources.length >= connectors.length) problems.push('no respondió ninguna fuente');
  const drafted = report.outcomes.some((o) => o.draft !== null);
  if (!drafted && report.outcomes.some((o) => o.stage === 'writer_failed' && o.review.decision === 'human_review')) {
    problems.push('el redactor falló por algo que no se arregla solo (revisá la clave)');
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
