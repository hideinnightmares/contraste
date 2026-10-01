import type { MetadataRoute } from 'next';
import { categories } from '@/config/categories';
import { absoluteUrl } from '@/config/site';
import { getRepository } from '@/data';
import { articlePath, sectionPath } from '@/lib/seo';

export const dynamic = 'force-static';

/**
 * Sitemap general. Las notas DEMO no se incluyen: son ficticias y llevan noindex.
 * Con contenido real, entran todas las notas publicadas.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = (await getRepository().listAllPublished()).filter((a) => !a.isDemo);
  const latest = articles[0]?.updatedAt;
  return [
    { url: absoluteUrl('/'), lastModified: latest, changeFrequency: 'hourly', priority: 1 },
    { url: absoluteUrl('/ultimas'), lastModified: latest, changeFrequency: 'hourly', priority: 0.8 },
    ...categories.map((c) => ({
      url: absoluteUrl(sectionPath(c.slug)),
      lastModified: articles.find((a) => a.category === c.slug)?.updatedAt,
      changeFrequency: 'hourly' as const,
      priority: 0.7,
    })),
    { url: absoluteUrl('/metodologia'), changeFrequency: 'monthly', priority: 0.4 },
    { url: absoluteUrl('/privacidad'), changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl('/terminos'), changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl('/cookies'), changeFrequency: 'yearly', priority: 0.2 },
    ...articles.map((a) => ({
      url: absoluteUrl(articlePath(a.slug)),
      lastModified: a.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.6,
      images: a.image ? [absoluteUrl(a.image.src)] : undefined,
    })),
  ];
}
