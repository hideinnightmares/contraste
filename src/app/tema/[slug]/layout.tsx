import { notFound } from 'next/navigation';
import { getRepository } from '@/data';

/** Responde 404 para temas inexistentes antes de que empiece el streaming. */
export default async function TagLayout({ children, params }: LayoutProps<'/tema/[slug]'>) {
  const { slug } = await params;
  const tags = await getRepository().listTags();
  if (!tags.some((t) => t.slug === slug)) notFound();
  return children;
}
