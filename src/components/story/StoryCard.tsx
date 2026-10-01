import Link from 'next/link';
import { getCategory } from '@/config/categories';
import type { ArticleSummary } from '@/domain/types';
import { contentTypeLabel } from '@/domain/labels';
import { articlePath } from '@/lib/seo';
import { DemoTag } from '@/components/demo/DemoStrip';
import { PublishedTime } from '@/components/time/PublishedTime';
import { StoryImage } from './StoryImage';
import { SourceMeter } from './SourceMeter';
import styles from './StoryCard.module.css';

export type StoryVariant = 'lead' | 'wide' | 'standard' | 'compact' | 'text' | 'overlay';

interface Props {
  article: ArticleSummary;
  variant: StoryVariant;
  now: Date;
  headingLevel?: 2 | 3;
  /** Muestra la bajada. Por defecto solo en las variantes grandes. */
  showDek?: boolean;
  /** Muestra el medidor de fuentes. */
  showSources?: boolean;
  preload?: boolean;
  /** Tamaño del titular en variantes `standard` y `text`. */
  size?: 's' | 'm';
  className?: string;
}

const sizes: Record<StoryVariant, string> = {
  lead: '(min-width: 64rem) 62vw, 100vw',
  wide: '(min-width: 64rem) 34vw, (min-width: 48rem) 50vw, 100vw',
  standard: '(min-width: 64rem) 26vw, (min-width: 48rem) 45vw, 100vw',
  compact: '7rem',
  text: '0px',
  overlay: '100vw',
};

const ratios: Record<StoryVariant, string> = {
  lead: '3 / 2',
  wide: '4 / 3',
  standard: '3 / 2',
  compact: '1 / 1',
  text: '1 / 1',
  overlay: '21 / 9',
};

export function StoryCard({
  article,
  variant,
  now,
  headingLevel = 3,
  showDek,
  showSources,
  preload,
  size = 'm',
  className,
}: Props) {
  const H = `h${headingLevel}` as const;
  const category = getCategory(article.category);
  const typeLabel = contentTypeLabel[article.type];
  const withImage = variant !== 'text' && article.image;
  const dek = showDek ?? (variant === 'lead' || variant === 'wide' || variant === 'overlay');
  const sources = showSources ?? variant !== 'compact';

  return (
    <article
      className={`story ${styles.card} ${styles[variant]} ${styles[`size-${size}`]} ${className ?? ''}`}
      data-type={article.type}
    >
      {withImage && (
        <StoryImage
          image={article.image!}
          articleId={article.id}
          ratio={ratios[variant]}
          sizes={sizes[variant]}
          preload={preload}
          className={styles.image}
        />
      )}
      <div className={styles.body}>
        <p className={styles.kicker}>
          <span className={styles.section}>{category?.name}</span>
          {typeLabel && <span className={styles.type}>{typeLabel}</span>}
          {article.live && (
            <span className={styles.live}>
              <span className={styles.pulse} aria-hidden="true" />
              En desarrollo
            </span>
          )}
          {article.isDemo && <DemoTag />}
        </p>
        <H className={styles.headline}>
          <Link href={articlePath(article.slug)} className="story-link" transitionTypes={['nav-forward']}>
            <span className="headline-link">{article.title}</span>
          </Link>
        </H>
        {dek && <p className={styles.dek}>{article.dek}</p>}
        <p className={styles.meta}>
          <PublishedTime iso={article.publishedAt} builtAt={now.toISOString()} />
          {sources && (
            <SourceMeter
              status={article.verification.status}
              sourceCount={article.sourceCount}
              independent={article.verification.independentSources}
            />
          )}
        </p>
      </div>
    </article>
  );
}
