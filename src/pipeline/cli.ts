/**
 * Ejecuta el pipeline desde la terminal.
 *
 *   npm run pipeline                 → fuentes habilitadas, sin redactor (llega hasta verificación)
 *   npm run pipeline -- --write      → además redacta con IA (Gemini si hay GEMINI_API_KEY en .env.pipeline)
 *   npm run pipeline -- --save       → guarda las notas en .data/pipeline/ (publicadas o en revisión)
 *
 * Imprime un informe por hecho y lo guarda en .data/pipeline/informes/.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { runPipeline } from './run';
import { createWriter } from './writers';
import { FilePublisher } from './stages/publish';
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

const label = {
  auto_publish: 'PUBLICACIÓN AUTOMÁTICA',
  human_review: 'REVISIÓN HUMANA',
  hold: 'EN ESPERA',
} as const;

async function main() {
  const writer = write ? createWriter() : null;
  console.log(`Contraste · pipeline (revisión: ${editorial.review.mode}, redactor: ${writer ? writer.name : 'ninguno'})\n`);
  const report = await runPipeline({
    writer,
    publisher: save ? new FilePublisher() : null,
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
