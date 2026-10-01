import type { Article, ArticleSummary } from './types';
import { readingMinutes } from './text';

export function toSummary(article: Article): ArticleSummary {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    dek: article.dek,
    category: article.category,
    type: article.type,
    tags: article.tags,
    image: article.image,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    priority: article.priority,
    live: article.live,
    isDemo: article.isDemo,
    byline: article.byline,
    verification: {
      status: article.verification.status,
      confidence: article.verification.confidence,
      independentSources: article.verification.independentSources,
    },
    sourceCount: article.sources.length,
    readingMinutes: readingMinutes(article.body),
  };
}

export const byNewest = (a: { publishedAt: string }, b: { publishedAt: string }) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
