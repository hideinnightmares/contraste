import { articleSchema } from '@/domain/schema';
import type { Article, ArticleSummary, Page } from '@/domain/types';
import { toSummary, byNewest } from '@/domain/summary';
import { slugify } from '@/domain/text';
import { RepositoryError, type ArticleRepository, type ListOptions } from './repository';

/**
 * Repositorio sobre un corpus completo en memoria: el dataset DEMO o la foto de la base que
 * se descarga antes de cada armado (scripts/sync-content.ts). El sitio es estático y se arma
 * entero de una vez, así que filtrar y paginar en memoria es lo más simple y lo más rápido.
 *
 * Cada fuente implementa `corpus()`. Acá se valida cada nota con el mismo esquema, se
 * descartan las que no están publicadas o tienen fecha futura, y se ordena.
 */
export abstract class InMemoryArticleRepository implements ArticleRepository {
  constructor(protected readonly clock: () => Date = () => new Date()) {}

  /** Todas las notas que la fuente puede mostrar, en cualquier orden. */
  protected abstract corpus(): Promise<Article[]>;

  /** Nombre de la fuente para los mensajes de error. */
  protected abstract readonly label: string;

  private loaded: Promise<Article[]> | null = null;

  private load(): Promise<Article[]> {
    this.loaded ??= this.corpus().then((articles) => this.prepare(articles));
    return this.loaded;
  }

  private prepare(articles: Article[]): Article[] {
    const now = this.clock();
    const problems: string[] = [];
    for (const a of articles) {
      const result = articleSchema.safeParse(a);
      if (!result.success) {
        problems.push(`${a.slug}: ${result.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
      }
    }
    if (problems.length > 0) {
      throw new RepositoryError(`${this.label} tiene notas inválidas:\n${problems.join('\n')}`);
    }
    const slugs = new Set<string>();
    for (const a of articles) {
      if (slugs.has(a.slug)) throw new RepositoryError(`Slug duplicado en ${this.label}: ${a.slug}`);
      slugs.add(a.slug);
    }
    return articles.filter((a) => a.review.status === 'published' && new Date(a.publishedAt) <= now).sort(byNewest);
  }

  async listAllPublished(): Promise<Article[]> {
    return this.load();
  }

  async listPublished(options: ListOptions = {}): Promise<Page<ArticleSummary>> {
    const pageSize = Math.min(Math.max(options.pageSize ?? 12, 1), 50);
    const page = Math.max(options.page ?? 1, 1);
    const filtered = (await this.load()).filter(
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
    return (await this.load()).find((a) => a.slug === slug) ?? null;
  }

  async getAdjacent(slug: string) {
    const all = await this.load();
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
    for (const a of await this.load()) {
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
