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
import { TopicsIndex } from './TopicsIndex';
import styles from '../../listing.module.css';

const PAGE_SIZE = 12;

/** Solo los temas con suficientes notas tienen página propia (ver MIN_NOTES_FOR_TAG_PAGE). */
async function topicsWithPage() {
  return (await getRepository().listTags()).filter((t) => t.count >= MIN_NOTES_FOR_TAG_PAGE);
}

type Route = { kind: 'index' } | { kind: 'topic'; slug: string; page: number };

/** `/tema` → índice; `/tema/clima` → página 1; `/tema/clima/pagina/2` → página 2. */
function parseRoute(segments: string[] | undefined): Route | null {
  if (!segments || segments.length === 0) return { kind: 'index' };
  const [slug, ...rest] = segments;
  const page = pageFromSegments(rest);
  return page ? { kind: 'topic', slug, page } : null;
}

// Solo existen las páginas generadas al armar el sitio; el resto es 404.
export const dynamicParams = false;

/**
 * La ruta es opcional (`[[...ruta]]`) para que `/tema` exista siempre: con `output: 'export'`,
 * Next.js corta el armado si una ruta dinámica no genera ninguna página, y con pocas notas
 * puede no haber ningún tema con página propia.
 */
export async function generateStaticParams() {
  const topics = await topicsWithPage();
  return [
    { ruta: [] },
    ...topics.flatMap((t) => pageSegments(pageCount(t.count, PAGE_SIZE)).map((pagina) => ({ ruta: [t.slug, ...pagina] }))),
  ];
}

export async function generateMetadata({ params }: PageProps<'/tema/[[...ruta]]'>): Promise<Metadata> {
  const route = parseRoute((await params).ruta);
  if (route?.kind === 'index') {
    return {
      title: 'Temas',
      description: `Los temas con más notas de ${site.name}.`,
      alternates: { canonical: '/tema' },
      robots: robotsFor(site.demoMode),
    };
  }
  const tag = route ? (await topicsWithPage()).find((t) => t.slug === route.slug) : undefined;
  if (!route || !tag) return { title: 'Tema no encontrado', robots: { index: false } };
  return {
    title: route.page > 1 ? `${tag.name}, página ${route.page}` : tag.name,
    description: `Todas las notas de ${site.name} sobre ${tag.name}.`,
    alternates: { canonical: pagedPath(tagPath(route.slug), route.page) },
    robots: robotsFor(site.demoMode),
  };
}

export default async function TopicPage({ params }: PageProps<'/tema/[[...ruta]]'>) {
  const route = parseRoute((await params).ruta);
  if (!route) notFound();
  const topics = await topicsWithPage();
  if (route.kind === 'index') return <TopicsIndex topics={topics} />;

  const { slug, page } = route;
  const tag = topics.find((t) => t.slug === slug);
  if (!tag) notFound();
  const now = new Date();
  const result = await getRepository().listPublished({ tagSlug: slug, page, pageSize: PAGE_SIZE });
  if (page > 1 && result.items.length === 0) notFound();

  return (
    <ViewTransition enter="page-fade" exit="page-fade" default="none">
      <div className={`container ${styles.page}`}>
        <Breadcrumbs
          items={[
            { name: 'Inicio', path: '/' },
            { name: 'Temas', path: '/tema' },
            { name: tag.name, path: tagPath(slug) },
          ]}
        />
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
