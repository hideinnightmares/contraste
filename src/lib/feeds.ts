import { absoluteUrl, site } from '@/config/site';
import { getCategory } from '@/config/categories';
import type { Article } from '@/domain/types';
import { articlePath } from './seo';

/** Escapa texto para XML. */
export function xml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Sitemap de Google News: solo notas de los últimos dos días y hasta 1000 URLs,
 * según la documentación de Google. Las notas DEMO quedan afuera.
 */
export function newsSitemap(articles: Article[], now: Date): string {
  const limit = now.getTime() - 2 * 86_400_000;
  const recent = articles
    .filter((a) => !a.isDemo && new Date(a.publishedAt).getTime() >= limit)
    .slice(0, 1000);
  const urls = recent
    .map(
      (a) => `  <url>
    <loc>${xml(absoluteUrl(articlePath(a.slug)))}</loc>
    <news:news>
      <news:publication>
        <news:name>${xml(site.name)}</news:name>
        <news:language>${site.language}</news:language>
      </news:publication>
      <news:publication_date>${a.publishedAt}</news:publication_date>
      <news:title>${xml(a.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;
}

/**
 * RSS 2.0 de las últimas notas. Es también el canal de distribución que usan
 * lectores de feeds y agregadores. Incluye las notas DEMO marcadas como tales,
 * porque un feed no es un índice de buscador.
 */
export function rssFeed(articles: Article[]): string {
  const items = articles
    .slice(0, 40)
    .map((a) => {
      const url = absoluteUrl(articlePath(a.slug));
      const title = a.isDemo ? `[DEMO] ${a.title}` : a.title;
      return `    <item>
      <title>${xml(title)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <description>${xml(a.dek)}</description>
      <category>${xml(getCategory(a.category)?.name ?? a.category)}</category>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(site.name)}</title>
    <link>${xml(absoluteUrl('/'))}</link>
    <description>${xml(site.description)}</description>
    <language>${site.locale.toLowerCase()}</language>
    <atom:link href="${xml(absoluteUrl('/rss.xml'))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}
