import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ViewTransition } from 'react';
import { categories, getCategory } from '@/config/categories';
import { site } from '@/config/site';
import { getRepository } from '@/data';
import { pagedPath, robotsFor, sectionPath } from '@/lib/seo';
import { pageCount, pageFromSegments, pageSegments } from '@/lib/paging';
import { Breadcrumbs } from '@/components/article/Breadcrumbs';
import { PageHeader } from '@/components/listing/PageHeader';
import { ArticleList } from '@/components/listing/ArticleList';
import { Pagination } from '@/components/listing/Pagination';
import { StoryCard } from '@/components/story/StoryCard';
import { AdSlot } from '@/components/ads/AdSlot';
import styles from '../../../listing.module.css';

const PAGE_SIZE = 10;

// Solo existen las secciones y páginas generadas al armar el sitio; el resto es 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  const repo = getRepository();
  const params = await Promise.all(
    categories.map(async (c) => {
      const { total } = await repo.listPublished({ category: c.slug, page: 1, pageSize: PAGE_SIZE });
      return pageSegments(pageCount(total, PAGE_SIZE)).map((pagina) => ({ slug: c.slug, pagina }));
    }),
  );
  return params.flat();
}

export async function generateMetadata({ params }: PageProps<'/seccion/[slug]/[[...pagina]]'>): Promise<Metadata> {
  const { slug, pagina } = await params;
  const category = getCategory(slug);
  const page = pageFromSegments(pagina);
  if (!category || !page) return { title: 'Sección no encontrada', robots: { index: false } };
  return {
    title: page > 1 ? `${category.name}, página ${page}` : category.name,
    description: category.description,
    alternates: { canonical: pagedPath(sectionPath(slug), page) },
    robots: robotsFor(site.demoMode),
    openGraph: { title: `${category.name} | ${site.name}`, description: category.description, url: sectionPath(slug) },
  };
}

export default async function SectionPage({ params }: PageProps<'/seccion/[slug]/[[...pagina]]'>) {
  const { slug, pagina } = await params;
  const category = getCategory(slug);
  const page = pageFromSegments(pagina);
  if (!category || !page) notFound();

  const now = new Date();
  const result = await getRepository().listPublished({ category: slug, page, pageSize: PAGE_SIZE });
  if (page > 1 && result.items.length === 0) notFound();

  const [lead, ...rest] = page === 1 ? result.items : [null, ...result.items];

  return (
    <ViewTransition enter="page-fade" exit="page-fade" default="none">
      <div className={`container ${styles.page}`}>
        <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: category.name, path: sectionPath(slug) }]} />
        <PageHeader title={category.name} description={category.description} />

        {result.total === 0 ? (
          <p className={styles.empty}>Todavía no hay notas publicadas en {category.name}. Volvé más tarde o mirá las últimas noticias de todas las secciones.</p>
        ) : (
          <div className={styles.layout}>
            <div className={styles.main}>
              {lead && (
                <div className={styles.lead}>
                  <StoryCard article={lead} variant={lead.image ? 'wide' : 'text'} now={now} headingLevel={2} preload />
                </div>
              )}
              <ArticleList items={rest.filter(Boolean).map((a) => ({ article: a! }))} now={now} showSection={false} adAfter={4} />
              <Pagination page={page} pageSize={PAGE_SIZE} total={result.total} href={(p) => pagedPath(sectionPath(slug), p)} />
            </div>
            <div className={styles.rail}>
              <AdSlot position="section-sidebar" variant="sidebar" />
            </div>
          </div>
        )}
      </div>
    </ViewTransition>
  );
}
