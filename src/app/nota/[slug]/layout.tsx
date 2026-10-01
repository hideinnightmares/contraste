import { notFound } from 'next/navigation';
import { getRepository } from '@/data';

/**
 * Comprueba que la nota exista antes de que empiece el streaming de la página
 * (que tiene loading.tsx). Así una nota inexistente responde 404 y no 200.
 */
export default async function ArticleLayout({ children, params }: LayoutProps<'/nota/[slug]'>) {
  const { slug } = await params;
  if (!(await getRepository().getBySlug(slug))) notFound();
  return children;
}
