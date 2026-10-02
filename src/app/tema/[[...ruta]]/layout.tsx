import { notFound } from 'next/navigation';
import { getRepository } from '@/data';
import { MIN_NOTES_FOR_TAG_PAGE } from '@/lib/seo';

/** Responde 404 para temas sin página propia antes de que empiece el streaming (importa en `next dev`). */
export default async function TopicLayout({ children, params }: LayoutProps<'/tema/[[...ruta]]'>) {
  const { ruta } = await params;
  if (!ruta || ruta.length === 0) return children; // el índice /tema
  const tags = await getRepository().listTags();
  if (!tags.some((t) => t.slug === ruta[0] && t.count >= MIN_NOTES_FOR_TAG_PAGE)) notFound();
  return children;
}
