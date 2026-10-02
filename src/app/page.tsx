import { ViewTransition } from 'react';
import { getCategory } from '@/config/categories';
import { getPopularity, getRepository } from '@/data';
import { composeFrontPage } from '@/domain/curation';
import { toSummary } from '@/domain/summary';
import { formatLongDate } from '@/domain/dates';
import type { ArticleSummary } from '@/domain/types';
import { serializeJsonLd, websiteJsonLd } from '@/lib/seo';
import { StoryCard } from '@/components/story/StoryCard';
import { LatestTimeline } from '@/components/home/LatestTimeline';
import { QuickNews } from '@/components/home/QuickNews';
import { AnalysisBand } from '@/components/home/AnalysisBand';
import { MostRead } from '@/components/home/MostRead';
import { SectionBlock } from '@/components/home/SectionBlock';
import { Recommended } from '@/components/home/Recommended';
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup';
import { AdSlot } from '@/components/ads/AdSlot';
import { EmptyFront } from '@/components/home/EmptyFront';
import styles from './page.module.css';

// La portada se arma con el sitio: en cada publicación y una vez por día (ver docs/DESPLIEGUE.md).

const MAIN_COLUMN_SECTIONS = ['politica', 'economia'];
const HALF_SECTIONS = ['ciencia', 'negocios'];

export default async function HomePage() {
  const now = new Date();
  const articles = await getRepository().listAllPublished();
  if (articles.length === 0) {
    return (
      <div className={styles.page}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd()) }} />
        <h1 className="visually-hidden">Contraste, portada del {formatLongDate(now)}</h1>
        <EmptyFront />
      </div>
    );
  }
  const summaries = articles.map(toSummary);
  const front = composeFrontPage(summaries, now);
  const popularity = await getPopularity().mostRead(5);
  const mostRead = popularity.slugs
    .map((slug) => summaries.find((a) => a.slug === slug))
    .filter((a): a is ArticleSummary => Boolean(a));

  const sections = new Map(front.sections.map((s) => [s.slug, s.items]));
  const block = (slug: string, width: 'full' | 'main' | 'half') => {
    const category = getCategory(slug);
    const items = sections.get(slug);
    if (!category || !items) return null;
    return <SectionBlock key={slug} category={category} items={items} now={now} width={width} />;
  };
  const fullWidth = front.sections
    .map((s) => s.slug)
    .filter((slug) => !MAIN_COLUMN_SECTIONS.includes(slug) && !HALF_SECTIONS.includes(slug));

  return (
    <ViewTransition enter="page-fade" exit="page-fade" default="none">
      <div className={styles.page}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd()) }} />
        <h1 className="visually-hidden">Contraste, portada del {formatLongDate(now)}</h1>

        <div className={`container ${styles.top}`}>
          <section className={styles.lead} aria-label="Noticia principal">
            {front.lead && <StoryCard article={front.lead} variant="lead" now={now} headingLevel={2} preload />}
          </section>
          <div className={styles.latest}>
            <LatestTimeline items={front.latest} now={now} headingId="ultimo-momento" />
          </div>
        </div>

        {front.secondary.length > 0 && (
          <section className={`container ${styles.secondary}`} aria-label="Otras noticias destacadas">
            {front.secondary[0] && (
              <div className={styles.secondaryWide} data-reveal>
                <StoryCard article={front.secondary[0]} variant="standard" size="m" now={now} headingLevel={2} showDek />
              </div>
            )}
            {front.secondary[1] && (
              <div data-reveal style={{ '--reveal-index': 1 } as React.CSSProperties}>
                <StoryCard article={front.secondary[1]} variant="standard" size="s" now={now} headingLevel={2} showDek />
              </div>
            )}
            {front.secondary[2] && (
              <div className={styles.secondaryText} data-reveal style={{ '--reveal-index': 2 } as React.CSSProperties}>
                <StoryCard article={front.secondary[2]} variant="text" size="m" now={now} headingLevel={2} showDek />
              </div>
            )}
          </section>
        )}

        <QuickNews items={front.quick} now={now} />

        <div className={`container ${styles.withRail}`}>
          <div className={styles.mainColumn}>{MAIN_COLUMN_SECTIONS.map((slug) => block(slug, 'main'))}</div>
          <div className={styles.rail}>
            <MostRead items={mostRead} simulated={popularity.simulated} />
            <AdSlot position="home-sidebar" variant="sidebar" />
          </div>
        </div>

        <AnalysisBand items={front.analysis} now={now} />

        <div className="container">
          <AdSlot position="home-infeed" />
        </div>

        <div className={`container ${styles.sections}`}>
          {fullWidth.slice(0, 2).map((slug) => block(slug, 'full'))}
          <div className={styles.halves}>{HALF_SECTIONS.map((slug) => block(slug, 'half'))}</div>
          {fullWidth.slice(2).map((slug) => block(slug, 'full'))}
          <Recommended items={front.recommended} now={now} />
        </div>

        <NewsletterSignup />
      </div>
    </ViewTransition>
  );
}
