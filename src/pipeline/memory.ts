import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PipelineReport, SourceItem } from './types';

/**
 * Memoria entre corridas: los ítems de las últimas horas, con título, resumen, dirección y
 * fecha (nunca el texto de las notas). Cada feed muestra solo sus últimas notas: sin memoria, un
 * hecho que un medio publicó a la mañana y otro a la tarde no se cruzaría nunca, porque a la
 * tarde el feed del primero ya no lo muestra.
 *
 * En GitHub Actions el archivo pasa de una corrida a la siguiente con la caché (ver
 * .github/workflows/pipeline.yml). Si falta o está dañado, la corrida sigue sin memoria.
 */

const VERSION = 1;

const SOURCE_KINDS = new Set(['news_agency', 'international_media', 'local_media', 'official', 'public_document', 'aggregator', 'other']);

function isItem(value: unknown): value is SourceItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const strings = ['id', 'sourceId', 'sourceName', 'origin', 'url', 'title', 'summary', 'publishedAt', 'fetchedAt'];
  return (
    strings.every((key) => typeof v[key] === 'string') &&
    SOURCE_KINDS.has(v.sourceKind as string) &&
    typeof v.discoveryOnly === 'boolean' &&
    typeof v.isDemo === 'boolean' &&
    !Number.isNaN(new Date(v.publishedAt as string).getTime())
  );
}

export async function loadMemory(file: string): Promise<{ items: SourceItem[]; warning?: string }> {
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch {
    // La primera corrida no tiene memoria.
    return { items: [] };
  }
  try {
    const data = JSON.parse(raw) as { version?: unknown; items?: unknown };
    if (data.version !== VERSION || !Array.isArray(data.items)) {
      return { items: [], warning: 'la memoria de corridas anteriores tiene otro formato: se empieza de cero' };
    }
    return { items: data.items.filter(isItem) };
  } catch {
    return { items: [], warning: 'la memoria de corridas anteriores está dañada: se empieza de cero' };
  }
}

/** Lo que conviene recordar de una corrida: los ítems reales de la ventana, sin el texto de las notas. */
export function itemsToRemember(report: PipelineReport, since: Date): SourceItem[] {
  const byId = new Map<string, SourceItem>();
  for (const outcome of report.outcomes) {
    for (const item of outcome.cluster.items) {
      if (item.isDemo || new Date(item.publishedAt) < since) continue;
      byId.set(item.id, { ...item, content: undefined });
    }
  }
  return [...byId.values()];
}

export async function saveMemory(file: string, items: SourceItem[], now = new Date()): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  // Se escribe aparte y se renombra: una corrida cortada a la mitad no deja un archivo roto.
  const partial = `${file}.parcial`;
  await writeFile(partial, JSON.stringify({ version: VERSION, savedAt: now.toISOString(), items }), 'utf8');
  await rename(partial, file);
}
