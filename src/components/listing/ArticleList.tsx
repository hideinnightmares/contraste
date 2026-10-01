import Link from 'next/link';
import { Fragment } from 'react';
import { getCategory } from '@/config/categories';
import type { ArticleSummary } from '@/domain/types';
import type { Highlight } from '@/domain/search';
import { contentTypeLabel } from '@/domain/labels';
import { articlePath } from '@/lib/seo';
import { StoryImage } from '@/components/story/StoryImage';
import { SourceMeter } from '@/components/story/SourceMeter';
import { DemoTag } from '@/components/demo/DemoStrip';
import { PublishedTime } from '@/components/time/PublishedTime';
import { Highlighted } from '@/components/search/Highlighted';
import { AdSlot } from '@/components/ads/AdSlot';
import styles from './ArticleList.module.css';

interface Item {
  article: ArticleSummary;
  title?: Highlight;
  snippet?: Highlight;
}

/**
 * Listado editorial (secciones, temas, buscador): filas con miniatura a la
 * derecha, para leer rápido muchos titulares. Puede intercalar un anuncio.
 */
export function ArticleList({
  items,
  now,
  showSection = true,
  adAfter,
  headingLevel = 2,
}: {
  items: Item[];
  now: Date;
  showSection?: boolean;
  adAfter?: number;
  headingLevel?: 2 | 3;
}) {
  const H = `h${headingLevel}` as const;
  return (
    <ol role="list" className={styles.list}>
      {items.map(({ article: a, title, snippet }, i) => (
        <Fragment key={a.id}>
          <li className={`story ${styles.item}`} data-reveal style={{ '--reveal-index': Math.min(i, 6) } as React.CSSProperties}>
            <div className={styles.text}>
              <p className={styles.kicker}>
                {showSection && <span className={styles.section}>{getCategory(a.category)?.name}</span>}
                {contentTypeLabel[a.type] && <span className={styles.type}>{contentTypeLabel[a.type]}</span>}
                {a.live && <span className={styles.live}>En desarrollo</span>}
                {a.isDemo && <DemoTag />}
              </p>
              <H className={styles.headline} data-type={a.type}>
                <Link href={articlePath(a.slug)} className="story-link">
                  <span className="headline-link">{title ? <Highlighted value={title} /> : a.title}</span>
                </Link>
              </H>
              <p className={styles.dek}>{snippet ? <Highlighted value={snippet} /> : a.dek}</p>
              <p className={styles.meta}>
                <PublishedTime iso={a.publishedAt} builtAt={now.toISOString()} />
                <SourceMeter status={a.verification.status} sourceCount={a.sourceCount} independent={a.verification.independentSources} />
              </p>
            </div>
            {a.image && (
              <StoryImage
                image={a.image}
                articleId={a.id}
                ratio="4 / 3"
                sizes="(min-width: 48rem) 16rem, 30vw"
                className={styles.image}
              />
            )}
          </li>
          {adAfter !== undefined && i === adAfter - 1 && items.length > adAfter && (
            <li className={styles.adItem}>
              <AdSlot position="section-infeed" />
            </li>
          )}
        </Fragment>
      ))}
    </ol>
  );
}
