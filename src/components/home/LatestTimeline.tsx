import Link from 'next/link';
import { getCategory } from '@/config/categories';
import type { ArticleSummary } from '@/domain/types';
import { PublishedTime } from '@/components/time/PublishedTime';
import { articlePath } from '@/lib/seo';
import styles from './LatestTimeline.module.css';

/**
 * Último momento: línea de tiempo vertical, en orden cronológico estricto.
 * Es la única parte de la portada que no se ordena por importancia.
 */
export function LatestTimeline({ items, now, headingId }: { items: ArticleSummary[]; now: Date; headingId: string }) {
  return (
    <section className={`invert ${styles.timeline}`} aria-labelledby={headingId}>
      <div className={styles.head}>
        <h2 id={headingId} className={styles.title}>
          <span className={styles.signal} aria-hidden="true" />
          Último momento
        </h2>
        <Link href="/ultimas" className={styles.all}>
          Todas las últimas
        </Link>
      </div>
      <ol role="list" className={styles.list}>
        {items.map((a, i) => (
          <li key={a.id} className={`story ${styles.item}`} data-reveal style={{ '--reveal-index': i } as React.CSSProperties}>
            <PublishedTime iso={a.publishedAt} builtAt={now.toISOString()} variant="timeline" className={styles.time} />
            <div className={styles.content}>
              <p className={styles.section}>
                {getCategory(a.category)?.name}
                {a.live && <span className={styles.live}>En desarrollo</span>}
              </p>
              <h3 className={styles.headline}>
                <Link href={articlePath(a.slug)} className="story-link">
                  <span className="headline-link">{a.title}</span>
                </Link>
              </h3>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
