import type { Metadata } from 'next';
import { ViewTransition } from 'react';
import { site } from '@/config/site';
import { getRepository } from '@/data';
import { calendarDay, formatLongDate } from '@/domain/dates';
import { toSummary } from '@/domain/summary';
import type { ArticleSummary } from '@/domain/types';
import { robotsFor } from '@/lib/seo';
import { Breadcrumbs } from '@/components/article/Breadcrumbs';
import { PageHeader } from '@/components/listing/PageHeader';
import { ArticleList } from '@/components/listing/ArticleList';
import { AdSlot } from '@/components/ads/AdSlot';
import styles from '../listing.module.css';

export const metadata: Metadata = {
  title: 'Últimas noticias',
  description: 'Todas las notas de Contraste en orden de publicación, de la más reciente a la más antigua.',
  alternates: { canonical: '/ultimas' },
  robots: robotsFor(site.demoMode),
};

export default async function LatestPage() {
  const now = new Date();
  const articles = (await getRepository().listAllPublished()).map(toSummary);
  const days = new Map<string, ArticleSummary[]>();
  for (const a of articles) {
    const key = calendarDay(a.publishedAt);
    days.set(key, [...(days.get(key) ?? []), a]);
  }
  const today = calendarDay(now);
  const yesterday = calendarDay(new Date(now.getTime() - 86_400_000));

  return (
    <ViewTransition enter="page-fade" exit="page-fade" default="none">
      <div className={`container ${styles.page}`}>
        <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: 'Últimas noticias', path: '/ultimas' }]} />
        <PageHeader title="Últimas noticias" description="Todo lo publicado, en orden cronológico. Sin ranking ni selección editorial." />
        <div className={styles.layout}>
          <div className={styles.main}>
            {articles.length === 0 && (
              <p className={styles.empty}>Todavía no hay notas publicadas. Aparecen acá apenas la redacción aprueba la primera.</p>
            )}
            {[...days.entries()].map(([day, items]) => {
              const label = day === today ? 'Hoy' : day === yesterday ? 'Ayer' : formatLongDate(items[0].publishedAt);
              const id = `dia-${day.replace(/\//g, '-')}`;
              return (
                <section key={day} className={styles.dayGroup} aria-labelledby={id}>
                  <h2 id={id} className={styles.dayTitle}>
                    {label}
                  </h2>
                  <ArticleList items={items.map((a) => ({ article: a }))} now={now} headingLevel={3} />
                </section>
              );
            })}
          </div>
          <div className={styles.rail}>
            <AdSlot position="section-sidebar" variant="sidebar" />
          </div>
        </div>
      </div>
    </ViewTransition>
  );
}
