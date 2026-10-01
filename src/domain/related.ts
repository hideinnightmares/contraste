import type { Article, ArticleSummary } from './types';
import { slugify } from './text';
import { byNewest } from './summary';

/**
 * Notas relacionadas: comparten etiquetas (lo que más pesa) o sección.
 * Una nota sin nada en común no aparece aunque sea reciente.
 */
export function relatedTo(article: Article, candidates: ArticleSummary[], limit = 3): ArticleSummary[] {
  const tags = new Set(article.tags.map(slugify));
  return candidates
    .filter((c) => c.id !== article.id)
    .map((c) => {
      const sharedTags = c.tags.filter((t) => tags.has(slugify(t))).length;
      const sameCategory = c.category === article.category ? 1 : 0;
      return { c, score: sharedTags * 3 + sameCategory * 2 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || byNewest(a.c, b.c))
    .slice(0, limit)
    .map((x) => x.c);
}
