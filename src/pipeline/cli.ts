/**
 * Ejecuta el pipeline desde la terminal.
 *
 *   npm run pipeline                 → fuentes habilitadas, sin redactor (llega hasta verificación)
 *   npm run pipeline -- --write      → además redacta con IA (Gemini si hay GEMINI_API_KEY en .env.pipeline)
 *   npm run pipeline -- --save       → guarda las notas y el informe en la base (Supabase) si hay
 *                                      SUPABASE_URL y SUPABASE_SECRET_KEY en .env.pipeline; si no,
 *                                      en .data/pipeline/ (publicadas o en revisión)
 *   npm run pipeline -- --save --permitir-demo
 *                                    → también guarda en la base las notas armadas con fuentes de
 *                                      prueba (quedan marcadas como demostración)
 *
 * Antes de redactar, lee el texto completo de cada nota real (respeta robots.txt, muros de pago y
 * la marca noai; ver sources/article.ts). Las fuentes de prueba no se leen.
 *
 * Imprime un informe por hecho y lo guarda en .data/pipeline/informes/.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { runPipeline } from './run';
import { createWriter } from './writers';
import { FilePublisher, type Publisher } from './stages/publish';
import { WebArticleFetcher } from './sources/article';
import { SupabaseStore, supabaseFromEnv } from './storage/supabase';
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

const label = {
  auto_publish: 'PUBLICACIÓN AUTOMÁTICA',
  human_review: 'REVISIÓN HUMANA',
  hold: 'EN ESPERA',
} as const;

async function main() {
  const writer = write ? createWriter() : null;
  const db = save ? supabaseFromEnv() : null;
  const store = db ? new SupabaseStore(db) : null;
  const destination = !save ? 'no guarda' : store ? 'base de datos' : 'archivos locales';
  console.log(
    `Contraste · pipeline (revisión: ${editorial.review.mode}, redactor: ${writer ? writer.name : 'ninguno'}, destino: ${destination})\n`,
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

  // Lee el texto completo de las notas reales (las fuentes de prueba no se leen).
  const fetcher = new WebArticleFetcher({ log: (m) => console.log(`  · ${m}`) });

  const report = await runPipeline({
    writer,
    fetcher,
    publisher,
    takenSlugs: store ? await store.existingSlugs() : undefined,
    coveredSourceUrls: store ? await store.coveredSourceUrls() : undefined,
    log: (m) => console.log(`  · ${m}`),
  });

  console.log(`\n${report.collected} ítems recopilados, ${report.clusters} hechos detectados.`);
  for (const f of report.failedSources) console.log(`  ! Fuente ${f.sourceId}: ${f.error}`);

  for (const o of report.outcomes) {
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

  if (store) {
    const runId = await store.recordRun(report);
    console.log(`\nInforme guardado en la base (pipeline_runs ${runId}).`);
  }

  const dir = path.join(process.cwd(), '.data', 'pipeline', 'informes');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${report.startedAt.replace(/[:.]/g, '-')}.json`);
  await writeFile(file, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nInforme guardado en ${path.relative(process.cwd(), file)}`);
}

main().catch((err) => {
  console.error('El pipeline falló:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
