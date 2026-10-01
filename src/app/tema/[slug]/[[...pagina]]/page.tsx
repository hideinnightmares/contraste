import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ViewTransition } from 'react';
import { site } from '@/config/site';
import { getRepository } from '@/data';
import { MIN_NOTES_FOR_TAG_PAGE, pagedPath, robotsFor, tagPath } from '@/lib/seo';
import { pageCount, pageFromSegments, pageSegments } from '@/lib/paging';
import { Breadcrumbs } from '@/components/article/Breadcrumbs';
import { PageHeader } from '@/components/listing/PageHeader';
import { ArticleList } from '@/components/listing/ArticleList';
import { Pagination } from '@/components/listing/Pagination';
import { AdSlot } from '@/components/ads/AdSlot';
import styles from '../../../listing.module.css';

const PAGE_SIZE = 12;

async function findTag(slug: string) {
  const tags = await getRepository().listTags();
  return tags.find((t) => t.slug === slug) ?? null;
}

// Solo existen los temas y páginas generados al armar el sitio; el resto es 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  const tags = (await getRepository().listTags()).filter((t) => t.count >= MIN_NOTES_FOR_TAG_PAGE);
  return tags.flatMap((t) => pageSegments(pageCount(t.count, PAGE_SIZE)).map((pagina) => ({ slug: t.slug, pagina })));
}

export async function generateMetadata({ params }: PageProps<'/tema/[slug]/[[...pagina]]'>): Promise<Metadata> {
  const { slug, pagina } = await params;
  const tag = await findTag(slug);
  const page = pageFromSegments(pagina);
  if (!tag || !page) return { title: 'Tema no encontrado', robots: { index: false } };
  return {
    title: page > 1 ? `${tag.name}, página ${page}` : tag.name,
    description: `Todas las notas de ${site.name} sobre ${tag.name}.`,
    alternates: { canonical: pagedPath(tagPath(slug), page) },
    robots: robotsFor(site.demoMode),
  };
}

export default async function TagPage({ params }: PageProps<'/tema/[slug]/[[...pagina]]'>) {
  const { slug, pagina } = await params;
  const tag = await findTag(slug);
  const page = pageFromSegments(pagina);
  if (!tag || !page) notFound();
  const now = new Date();
  const result = await getRepository().listPublished({ tagSlug: slug, page, pageSize: PAGE_SIZE });

  return (
    <ViewTransition enter="page-fade" exit="page-fade" default="none">
      <div className={`container ${styles.page}`}>
        <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: `Tema: ${tag.name}`, path: tagPath(slug) }]} />
        <PageHeader
          eyebrow="Tema"
          title={tag.name}
          description={`${tag.count} ${tag.count === 1 ? 'nota publicada' : 'notas publicadas'}, de la más reciente a la más antigua.`}
        />
        <div className={styles.layout}>
          <div className={styles.main}>
            <ArticleList items={result.items.map((a) => ({ article: a }))} now={now} adAfter={5} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={result.total} href={(p) => pagedPath(tagPath(slug), p)} />
          </div>
          <div className={styles.rail}>
            <AdSlot position="section-sidebar" variant="sidebar" />
          </div>
        </div>
      </div>
    </ViewTransition>
  );
}
