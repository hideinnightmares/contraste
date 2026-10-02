import { decodeEntities } from './connector';

/**
 * Feeds que declara o enlaza una página. Lo usa el probador de fuentes (scripts/probar-fuentes.ts)
 * para sugerir la dirección correcta cuando la configurada deja de andar.
 *
 * - `declared`: los `<link rel="alternate" type="application/rss+xml">` (o Atom, o RDF), que es
 *   como un sitio anuncia sus feeds.
 * - `linked`: enlaces que por su dirección parecen feeds o la página que los lista ("/rss").
 */
export function feedLinks(html: string, baseUrl: string): { declared: string[]; linked: string[] } {
  const resolve = (href: string): string | null => {
    try {
      const url = new URL(decodeEntities(href.trim()), baseUrl);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
    } catch {
      return null;
    }
  };
  const attribute = (tag: string, name: string) =>
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)?.slice(1).find((v) => v !== undefined);

  const declared = new Set<string>();
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attribute(tag, 'rel')?.toLowerCase().split(/\s+/) ?? [];
    const type = attribute(tag, 'type')?.toLowerCase() ?? '';
    if (!rel.includes('alternate') || !/^application\/(?:rss|atom|rdf)\+xml/.test(type)) continue;
    const href = attribute(tag, 'href');
    const url = href ? resolve(href) : null;
    if (url) declared.add(url);
  }

  const linked = new Set<string>();
  for (const [tag] of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attribute(tag, 'href');
    if (!href || !/(?:^|[/._-])(?:rss|feeds?|atom)(?:[/._?-]|$)|\.xml(?:$|\?)/i.test(href)) continue;
    const url = resolve(href);
    if (url && !declared.has(url)) linked.add(url);
  }
  return { declared: [...declared], linked: [...linked] };
}

/** Direcciones habituales de feeds, para probar cuando la portada no declara ninguno. */
export const COMMON_FEED_PATHS = [
  '/rss',
  '/rss/',
  '/rss.xml',
  '/feed',
  '/feed/',
  '/feeds/rss/',
  '/arc/outboundfeeds/rss/?outputType=xml',
  '/index.xml',
  '/atom.xml',
];

/** Si dos direcciones son del mismo sitio: el mismo dominio, con o sin `www.`, o un subdominio suyo. */
export function sameSite(a: string, b: string): boolean {
  try {
    const host = (url: string) => new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    const [ha, hb] = [host(a), host(b)];
    return ha === hb || ha.endsWith(`.${hb}`) || hb.endsWith(`.${ha}`);
  } catch {
    return false;
  }
}
