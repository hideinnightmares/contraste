import { notFound } from 'next/navigation';
import { getRepository } from '@/data';

/**
 * Comprueba que la nota exista antes de que empiece el streaming de la página
 * (que tiene loading.tsx). Así una nota inexistente responde 404 y no 200.
 */
export default async function ArticleLayout({ children, params }: LayoutProps<'/nota/[[...slug]]'>) {
  const { slug } = await params;
  if (!slug || slug.length === 0) return children; // el índice /nota
  if (slug.length > 1 || !(await getRepository().getBySlug(slug[0]))) notFound();
  return children;
}
