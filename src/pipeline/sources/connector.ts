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

/** Entidades con nombre que aparecen en textos en castellano; el resto se escribe como número. */
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  Aacute: 'Á',
  Eacute: 'É',
  Iacute: 'Í',
  Oacute: 'Ó',
  Uacute: 'Ú',
  ntilde: 'ñ',
  Ntilde: 'Ñ',
  uuml: 'ü',
  Uuml: 'Ü',
  iexcl: '¡',
  iquest: '¿',
  laquo: '«',
  raquo: '»',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  deg: '°',
  ordf: 'ª',
  ordm: 'º',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return NAMED_ENTITIES[body] ?? entity;
  });
}

/** Quita etiquetas HTML y decodifica entidades de un resumen de feed o de un párrafo. */
export function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
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
    isDemo: source.connector === 'fixture',
  };
}
