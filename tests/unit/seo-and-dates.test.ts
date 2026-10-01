import { describe, expect, it } from 'vitest';
import { demoArticles } from '@/content/demo';
import { articleJsonLd, articleMetadata, robotsFor, serializeJsonLd } from '@/lib/seo';
import { newsSitemap, rssFeed, xml } from '@/lib/feeds';
import { adsTxtLine, isAdSenseConfigured } from '@/config/ads';
import { formatPublished, calendarDay } from '@/domain/dates';
import { slugify, truncate } from '@/domain/text';

const NOW = new Date('2026-10-01T13:25:00Z');
const articles = demoArticles(NOW);

describe('SEO', () => {
  it('las notas DEMO salen con noindex', () => {
    const meta = articleMetadata(articles[0]);
    expect(meta.robots).toEqual(robotsFor(true));
    expect(meta.alternates?.canonical).toBe(`/nota/${articles[0].slug}`);
    expect(meta.openGraph).toMatchObject({ type: 'article' });
  });

  it('usa el tipo de Schema.org que corresponde al formato', () => {
    const analysis = articles.find((a) => a.type === 'analisis')!;
    const explainer = articles.find((a) => a.type === 'explicador')!;
    const news = articles.find((a) => a.type === 'noticia')!;
    expect(articleJsonLd(analysis)['@type']).toBe('AnalysisNewsArticle');
    expect(articleJsonLd(explainer)['@type']).toBe('BackgroundNewsArticle');
    expect(articleJsonLd(news)['@type']).toBe('NewsArticle');
    expect(articleJsonLd(news).headline.length).toBeLessThanOrEqual(110);
  });

  it('escapa el JSON-LD para que no pueda cerrar el <script>', () => {
    expect(serializeJsonLd({ a: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });

  it('el sitemap de Google News excluye DEMO y notas de más de dos días', () => {
    expect(newsSitemap(articles, NOW)).not.toContain('<url>');
    const real = articles.slice(0, 2).map((a, i) => ({
      ...a,
      isDemo: false,
      publishedAt: i === 0 ? NOW.toISOString() : new Date(NOW.getTime() - 3 * 86_400_000).toISOString(),
    }));
    const xmlOut = newsSitemap(real, NOW);
    expect(xmlOut.match(/<url>/g)).toHaveLength(1);
    expect(xmlOut).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
  });

  it('el RSS marca las notas DEMO y escapa caracteres', () => {
    const feed = rssFeed(articles);
    expect(feed).toContain('[DEMO]');
    expect(xml('a & <b>')).toBe('a &amp; &lt;b&gt;');
  });
});

describe('AdSense', () => {
  it('sin ID de editor no hay ads.txt ni scripts', () => {
    expect(isAdSenseConfigured()).toBe(false);
    expect(adsTxtLine()).toBeNull();
  });
});

describe('fechas en hora de Buenos Aires', () => {
  it('"Hoy" y "Ayer" se calculan con el día de Buenos Aires, no el UTC', () => {
    // 02:30 UTC del 2 de octubre = 23:30 del 1 de octubre en Buenos Aires.
    const now = new Date('2026-10-02T02:30:00Z');
    expect(formatPublished('2026-10-02T01:00:00Z', now)).toBe('Hoy, 22:00');
    expect(formatPublished('2026-09-30T20:00:00Z', now)).toBe('Ayer, 17:00');
    expect(calendarDay(now)).toBe('01/10/2026');
  });
});

describe('texto', () => {
  it('genera slugs limpios y recorta en límite de palabra', () => {
    expect(slugify('¿Qué es La Niña? Año 2026')).toBe('que-es-la-nina-ano-2026');
    expect(truncate('Una frase bastante larga para recortar', 20)).toBe('Una frase bastante…');
  });
});
