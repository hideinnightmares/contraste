import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/config/site';

export const dynamic = 'force-static';

/**
 * robots.txt. Las notas DEMO se excluyen con `noindex` en cada página (no con
 * Disallow: si se bloqueara el rastreo, el buscador no podría leer el noindex).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/buscar', '/newsletter/'],
      },
    ],
    sitemap: [absoluteUrl('/sitemap.xml'), absoluteUrl('/news-sitemap.xml')],
  };
}
