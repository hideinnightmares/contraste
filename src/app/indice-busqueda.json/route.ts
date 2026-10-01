import { getRepository } from '@/data';
import { toSearchDocument } from '@/domain/search';

export const dynamic = 'force-static';

/**
 * Índice del buscador: se genera al armar el sitio y la búsqueda corre en el
 * navegador (src/lib/search-index.ts). Solo contiene notas publicadas.
 */
export async function GET() {
  const articles = await getRepository().listAllPublished();
  return Response.json(articles.map(toSearchDocument));
}
