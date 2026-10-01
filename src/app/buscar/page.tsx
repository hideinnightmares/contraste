import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getRepository } from '@/data';
import { Breadcrumbs } from '@/components/article/Breadcrumbs';
import { PageHeader } from '@/components/listing/PageHeader';
import { RowsSkeleton } from '@/components/skeleton/Skeleton';
import { AdvancedSearch } from './AdvancedSearch';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Buscar',
  description: 'Buscá notas por palabra, sección, formato, tema o fecha.',
  alternates: { canonical: '/buscar' },
  // Las páginas de resultados no se indexan: son infinitas y duplican contenido.
  robots: { index: false, follow: true },
};

export default async function SearchPage() {
  const tags = await getRepository().listTags();
  return (
    <div className={`container ${styles.page}`}>
      <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: 'Buscar', path: '/buscar' }]} />
      <PageHeader title="Buscar" description="En títulos, textos, secciones y temas. Combiná filtros para acotar por fecha o formato." />
      {/* Los criterios están en la dirección: el formulario y los resultados se arman en el navegador. */}
      <Suspense fallback={<RowsSkeleton label="Cargando el buscador…" />}>
        <AdvancedSearch tags={tags.map((t) => ({ slug: t.slug, name: t.name, count: t.count }))} />
      </Suspense>
    </div>
  );
}
