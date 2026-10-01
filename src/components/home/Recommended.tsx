import type { ArticleSummary } from '@/domain/types';
import { StoryCard } from '@/components/story/StoryCard';
import { SectionHeading } from './SectionHeading';
import styles from './Recommended.module.css';

/** "Para leer con tiempo": lecturas largas que no entraron arriba, una por sección. */
export function Recommended({ items, now, title = 'Para leer con tiempo', id = 'para-leer' }: { items: ArticleSummary[]; now: Date; title?: string; id?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className={styles.section}>
      <SectionHeading id={id} title={title} />
      <ul role="list" className={styles.list}>
        {items.map((a, i) => (
          <li key={a.id} data-reveal style={{ '--reveal-index': i } as React.CSSProperties}>
            <StoryCard article={a} variant={a.image ? 'standard' : 'text'} size="s" now={now} showDek={!a.image} />
            <p className={styles.minutes}>{a.readingMinutes} min de lectura</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
