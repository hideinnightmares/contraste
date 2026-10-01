import { notFound } from 'next/navigation';
import { getCategory } from '@/config/categories';

/** Responde 404 para secciones inexistentes antes de que empiece el streaming. */
export default async function SectionLayout({ children, params }: LayoutProps<'/seccion/[slug]'>) {
  const { slug } = await params;
  if (!getCategory(slug)) notFound();
  return children;
}
