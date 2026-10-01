import type { SourceDefinition, SourceItem } from '../types';

/**
 * Conector de fuente. Cada tipo de origen (RSS, API de noticias, sitio oficial)
 * implementa esta interfaz; el resto del pipeline no sabe de dónde vino un ítem.
 */
export interface SourceConnector {
  readonly source: SourceDefinition;
  fetchItems(options: { since: Date; signal?: AbortSignal }): Promise<SourceItem[]>;
}

export class ConnectorError extends Error {
  constructor(
    readonly sourceId: string,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ConnectorError';
  }
}

/** Quita etiquetas HTML y entidades comunes de un resumen de feed. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** URL canónica para comparar: sin parámetros de campaña ni fragmentos. */
export function canonicalUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref$|src$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.replace(/^www\./, '');
    return url.toString().replace(/\/$/, '');
  } catch {
    return raw;
  }
}

export function itemFromParts(
  source: SourceDefinition,
  parts: { url: string; title: string; summary: string; content?: string; publishedAt: string },
  fetchedAt: Date,
): SourceItem {
  const url = canonicalUrl(parts.url);
  return {
    id: `${source.id}:${url}`,
    sourceId: source.id,
    sourceName: source.name,
    sourceKind: source.kind,
    origin: source.origin,
    discoveryOnly: source.discoveryOnly ?? source.kind === 'aggregator',
    url,
    title: stripHtml(parts.title),
    summary: stripHtml(parts.summary),
    content: parts.content ? stripHtml(parts.content) : undefined,
    publishedAt: parts.publishedAt,
    fetchedAt: fetchedAt.toISOString(),
  };
}
