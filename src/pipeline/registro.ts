import type { PipelineReport } from './types';

/**
 * Registro de la corrida. Cada mensaje lleva aparte los datos del hecho (título, dirección de una
 * nota, slug). En GitHub Actions el registro es público, porque el repositorio lo es: con
 * CONTRASTE_REGISTRO=resumen se muestran solo los mensajes, las cantidades y los errores, sin
 * adelantar qué se está por publicar ni lo que la redacción va a descartar. El detalle de cada
 * hecho queda en el informe de la corrida, en la base (pipeline_runs), que solo ve la redacción.
 */

export type Log = (message: string, detail?: string) => void;

export const summaryFromEnv = (env: Record<string, string | undefined> = process.env) =>
  env.CONTRASTE_REGISTRO?.trim().toLowerCase() === 'resumen';

export function logLine(message: string, detail: string | undefined, summaryOnly: boolean): string {
  return detail && !summaryOnly ? `${message}: ${detail}` : message;
}

/** Cantidades y errores de la corrida, sin títulos ni hechos. */
export function summaryLines(report: PipelineReport): string[] {
  const { outcomes } = report;
  const drafted = outcomes.filter((o) => o.draft !== null);
  const saved = outcomes.filter((o) => o.stage === 'drafted' && o.savedAs !== undefined && !o.savedAs.startsWith('no guardada'));
  const autoPublished = saved.filter((o) => o.review.decision === 'auto_publish');
  const deferred = outcomes.filter((o) => o.stage === 'deferred');

  const lines = [`Borradores redactados: ${drafted.length}; guardados: ${saved.length}.`];
  if (autoPublished.length > 0) lines.push(`Publicados solos por la política: ${autoPublished.length}.`);
  lines.push(`Para la próxima corrida: ${deferred.length}.`);
  for (const o of outcomes) {
    if (o.stage === 'writer_failed') lines.push(`! Redactor: ${o.error}`);
    if (o.stage === 'save_failed') lines.push(`! Guardado: ${o.error}`);
  }
  return lines;
}
