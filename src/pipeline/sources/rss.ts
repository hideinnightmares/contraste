import { XMLParser } from 'fast-xml-parser';
import type { SourceDefinition, SourceItem } from '../types';
import { ConnectorError, itemFromParts, type SourceConnector } from './connector';
import { userAgent } from './http';

const MAX_BYTES = 5_000_000;
const TIMEOUT_MS = 15_000;

type Node = Record<string, unknown>;

const text = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object' && '#text' in (v as Node)) return String((v as Node)['#text']);
  return '';
};
const list = <T>(v: T | T[] | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** Parsea RSS 2.0 y Atom. Exportado para tests. */
export function parseFeed(xml: string): { url: string; title: string; summary: string; content?: string; publishedAt: string }[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', processEntities: true, htmlEntities: true });
  const doc = parser.parse(xml) as Node;

  const rss = doc.rss as Node | undefined;
  if (rss) {
    const channel = rss.channel as Node;
    return list(channel?.item as Node | Node[]).map((item) => ({
      url: text(item.link) || text(item.guid),
      title: text(item.title),
      summary: text(item.description),
      content: text(item['content:encoded']) || undefined,
      publishedAt: toIso(text(item.pubDate) || text(item['dc:date'])),
    }));
  }

  const feed = doc.feed as Node | undefined;
  if (feed) {
    return list(feed.entry as Node | Node[]).map((entry) => {
      const links = list(entry.link as Node | Node[]);
      const alternate = links.find((l) => !l['@_rel'] || l['@_rel'] === 'alternate') ?? links[0];
      return {
        url: alternate ? String(alternate['@_href'] ?? '') : '',
        title: text(entry.title),
        summary: text(entry.summary),
        content: text(entry.content) || undefined,
        publishedAt: toIso(text(entry.published) || text(entry.updated)),
      };
    });
  }

  throw new Error('El documento no es RSS ni Atom.');
}

function toIso(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

/** Conector RSS/Atom real: descarga el feed con límite de tiempo y de tamaño. */
export class RssConnector implements SourceConnector {
  constructor(
    readonly source: SourceDefinition,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async fetchItems({ since, signal }: { since: Date; signal?: AbortSignal }): Promise<SourceItem[]> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let res: Response;
    try {
      res = await this.fetchImpl(this.source.url, {
        signal: combined,
        headers: { 'User-Agent': userAgent(), Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5' },
      });
    } catch (err) {
      throw new ConnectorError(this.source.id, `No se pudo descargar el feed: ${(err as Error).message}`, err);
    }
    if (!res.ok) throw new ConnectorError(this.source.id, `El feed respondió HTTP ${res.status}`);
    const length = Number(res.headers.get('content-length') ?? '0');
    if (length > MAX_BYTES) throw new ConnectorError(this.source.id, 'El feed supera el tamaño máximo');
    const body = await res.text();
    if (body.length > MAX_BYTES) throw new ConnectorError(this.source.id, 'El feed supera el tamaño máximo');

    let entries;
    try {
      entries = parseFeed(body);
    } catch (err) {
      throw new ConnectorError(this.source.id, `Feed inválido: ${(err as Error).message}`, err);
    }
    const now = new Date();
    return entries
      .filter((e) => e.url && e.title && new Date(e.publishedAt) >= since)
      .map((e) => itemFromParts(this.source, e, now));
  }
}
