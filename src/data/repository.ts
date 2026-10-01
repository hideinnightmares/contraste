import type { Article, ArticleSummary, Page } from '@/domain/types';

/**
 * Acceso a notas publicadas.
 *
 * Es la única puerta entre el frontend y el almacenamiento. Hoy la implementa
 * `DemoArticleRepository` (dataset ficticio en memoria). Para pasar a producción se
 * escribe otra implementación —una base SQL, un CMS headless, una API propia— y se
 * elige en `src/data/index.ts` con `CONTENT_SOURCE`. Las páginas no cambian.
 *
 * Contrato: solo devuelve notas con `review.status === 'published'`.
 */
export interface ArticleRepository {
  /** Todas las notas publicadas, de la más nueva a la más vieja. */
  listPublished(options?: ListOptions): Promise<Page<ArticleSummary>>;
  getBySlug(slug: string): Promise<Article | null>;
  /** Nota anterior y siguiente en orden cronológico dentro de la misma sección. */
  getAdjacent(slug: string): Promise<{ previous: ArticleSummary | null; next: ArticleSummary | null }>;
  /** Todas las etiquetas en uso con su cantidad de notas. */
  listTags(): Promise<{ slug: string; name: string; count: number }[]>;
  /** Corpus completo para el buscador y la curaduría de portada. */
  listAllPublished(): Promise<Article[]>;
}

export interface ListOptions {
  category?: string;
  tagSlug?: string;
  page?: number;
  pageSize?: number;
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}
