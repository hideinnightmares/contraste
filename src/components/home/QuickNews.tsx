import type { ArticleSummary } from '@/domain/types';
import { StoryCard } from '@/components/story/StoryCard';
import styles from './QuickNews.module.css';

/** "En breve": datos cortos, sin fotos, en una sola franja horizontal. */
export function QuickNews({ items, now }: { items: ArticleSummary[]; now: Date }) {
  if (items.length === 0) return null;
  return (
    <section className={`highlight-band ${styles.band}`} aria-labelledby="en-breve">
      <div className={`container ${styles.inner}`}>
        <h2 id="en-breve" className={styles.title}>
          En breve
        </h2>
        <ul role="list" className={styles.list}>
          {items.map((a, i) => (
            <li key={a.id} data-reveal style={{ '--reveal-index': i } as React.CSSProperties}>
              <StoryCard article={a} variant="text" size="s" now={now} showSources={false} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
