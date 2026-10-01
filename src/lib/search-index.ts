import { buildIndex, type IndexedArticle, type SearchDocument } from '@/domain/search';

export const SEARCH_INDEX_PATH = '/indice-busqueda.json';

let pending: Promise<IndexedArticle[]> | null = null;

/**
 * Descarga el índice del buscador una sola vez por visita y lo deja listo para
 * buscar. Si la descarga falla, el próximo intento vuelve a pedirlo.
 */
export function loadSearchIndex(): Promise<IndexedArticle[]> {
  pending ??= fetch(SEARCH_INDEX_PATH)
    .then((res) => {
      if (!res.ok) throw new Error(`El índice de búsqueda respondió ${res.status}`);
      return res.json() as Promise<SearchDocument[]>;
    })
    .then(buildIndex)
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });
  return pending;
}
