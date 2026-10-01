import { articleSchema } from '@/domain/schema';
import type { Article, ArticleSummary, Page } from '@/domain/types';
import { toSummary, byNewest } from '@/domain/summary';
import { slugify } from '@/domain/text';
import { demoArticles } from '@/content/demo';
import { RepositoryError, type ArticleRepository, type ListOptions } from './repository';

/**
 * Repositorio sobre el dataset DEMO en memoria.
 *
 * Valida cada nota con el mismo esquema que usaría cualquier otra fuente: si el
 * dataset tiene un error (una sección inexistente, una fuente citada que no está
 * en la lista), la carga falla con un mensaje claro en lugar de romper una página.
 */
export class DemoArticleRepository implements ArticleRepository {
  constructor(private readonly clock: () => Date = () => new Date()) {}

  private load(): Article[] {
    const now = this.clock();
    const articles = demoArticles(now);
    const problems: string[] = [];
    for (const a of articles) {
      const result = articleSchema.safeParse(a);
      if (!result.success) {
        problems.push(`${a.slug}: ${result.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
      }
    }
    if (problems.length > 0) {
      throw new RepositoryError(`El dataset DEMO tiene notas inválidas:\n${problems.join('\n')}`);
    }
    const slugs = new Set<string>();
    for (const a of articles) {
      if (slugs.has(a.slug)) throw new RepositoryError(`Slug duplicado en el dataset DEMO: ${a.slug}`);
      slugs.add(a.slug);
    }
    return articles
      .filter((a) => a.review.status === 'published' && new Date(a.publishedAt) <= now)
      .sort(byNewest);
  }

  async listAllPublished(): Promise<Article[]> {
    return this.load();
  }

  async listPublished(options: ListOptions = {}): Promise<Page<ArticleSummary>> {
    const pageSize = Math.min(Math.max(options.pageSize ?? 12, 1), 50);
    const page = Math.max(options.page ?? 1, 1);
    const filtered = this.load().filter(
      (a) =>
        (!options.category || a.category === options.category) &&
        (!options.tagSlug || a.tags.some((t) => slugify(t) === options.tagSlug)),
    );
    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize).map(toSummary),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  async getBySlug(slug: string): Promise<Article | null> {
    return this.load().find((a) => a.slug === slug) ?? null;
  }

  async getAdjacent(slug: string) {
    const all = this.load();
    const current = all.find((a) => a.slug === slug);
    if (!current) return { previous: null, next: null };
    const sameSection = all.filter((a) => a.category === current.category);
    const i = sameSection.findIndex((a) => a.slug === slug);
    // La lista está de más nueva a más vieja: "anterior" es la publicada antes.
    const previous = sameSection[i + 1] ?? null;
    const next = sameSection[i - 1] ?? null;
    return { previous: previous && toSummary(previous), next: next && toSummary(next) };
  }

  async listTags() {
    const counts = new Map<string, { name: string; count: number }>();
    for (const a of this.load()) {
      for (const t of a.tags) {
        const slug = slugify(t);
        const entry = counts.get(slug) ?? { name: t, count: 0 };
        entry.count += 1;
        counts.set(slug, entry);
      }
    }
    return [...counts.entries()]
      .map(([slug, v]) => ({ slug, ...v }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));
  }
}
