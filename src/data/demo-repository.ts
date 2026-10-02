import type { Article } from '@/domain/types';
import { demoArticles } from '@/content/demo';
import { InMemoryArticleRepository } from './in-memory-repository';

/**
 * Repositorio sobre el dataset DEMO en memoria.
 *
 * Valida cada nota con el mismo esquema que usaría cualquier otra fuente: si el
 * dataset tiene un error (una sección inexistente, una fuente citada que no está
 * en la lista), la carga falla con un mensaje claro en lugar de romper una página.
 */
export class DemoArticleRepository extends InMemoryArticleRepository {
  protected readonly label = 'El dataset DEMO';

  protected async corpus(): Promise<Article[]> {
    return demoArticles(this.clock());
  }
}
