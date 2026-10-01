import type { ArticleSummary } from '@/domain/types';
import { StoryCard } from '@/components/story/StoryCard';
import { SectionHeading } from './SectionHeading';
import styles from './AnalysisBand.module.css';

/**
 * Análisis y explicadores en una banda de paleta invertida. La separación visual
 * es deliberada: lo que está acá es interpretación o contexto, no la noticia.
 */
export function AnalysisBand({ items, now }: { items: ArticleSummary[]; now: Date }) {
  if (items.length === 0) return null;
  const [first, ...rest] = items;
  return (
    <section className={`invert ${styles.band}`} aria-labelledby="analisis">
      <div className="container">
        <SectionHeading
          id="analisis"
          title="Análisis y contexto"
          description="Interpretación editorial y explicadores. Separamos lo que opinamos de lo que informamos."
        />
        <div className={styles.grid}>
          <div data-reveal>
            <StoryCard article={first} variant="wide" now={now} headingLevel={3} />
          </div>
          {rest.length > 0 && (
            <ul role="list" className={styles.rest}>
              {rest.map((a, i) => (
                <li key={a.id} data-reveal style={{ '--reveal-index': i + 1 } as React.CSSProperties}>
                  <StoryCard article={a} variant="text" size="s" now={now} showDek />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
