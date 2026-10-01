import type { CategoryConfig } from '@/config/categories';
import type { ArticleSummary } from '@/domain/types';
import { StoryCard } from '@/components/story/StoryCard';
import { sectionPath } from '@/lib/seo';
import { SectionHeading } from './SectionHeading';
import styles from './SectionBlock.module.css';

interface Props {
  category: CategoryConfig;
  items: ArticleSummary[];
  now: Date;
  /** Ancho disponible: condiciona cuántas columnas usa cada diseño. */
  width: 'full' | 'main' | 'half';
}

/**
 * Bloque de sección en portada. Cada sección tiene un diseño propio (definido en
 * la configuración) para que la portada no sea una grilla de tarjetas iguales.
 */
export function SectionBlock({ category, items, now, width }: Props) {
  if (items.length === 0) return null;
  const id = `seccion-${category.slug}`;
  const [first, ...rest] = items;
  // Con una sola nota, cualquier diseño se resuelve como una nota ancha.
  const layout = width === 'half' ? 'headlines' : items.length === 1 && first.image && width !== 'main' ? 'single' : category.layout;

  return (
    <section className={`${styles.block} ${styles[`w-${width}`]}`} aria-labelledby={id} data-layout={layout}>
      <SectionHeading id={id} title={category.name} href={sectionPath(category.slug)} linkLabel={`Más de ${category.name}`} />

      {layout === 'single' && (
        <div data-reveal>
          <StoryCard article={first} variant="wide" size="s" now={now} />
        </div>
      )}

      {layout === 'lead-and-list' && rest.length === 0 && (
        <div data-reveal>
          <StoryCard article={first} variant={first.image ? 'wide' : 'text'} size="s" now={now} showDek />
        </div>
      )}

      {layout === 'lead-and-list' && rest.length > 0 && (
        <div className={styles.leadList}>
          <div data-reveal>
            <StoryCard article={first} variant={first.image ? 'standard' : 'text'} now={now} showDek />
          </div>
          {rest.length > 0 && (
            <ul role="list" className={styles.list}>
              {rest.map((a, i) => (
                <li key={a.id} data-reveal style={{ '--reveal-index': i + 1 } as React.CSSProperties}>
                  <StoryCard article={a} variant={a.image ? 'compact' : 'text'} size="s" now={now} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {layout === 'feature' && (
        <div className={styles.feature}>
          <div data-reveal>
            {first.image ? (
              <StoryCard article={first} variant="overlay" now={now} />
            ) : (
              <StoryCard article={first} variant="text" now={now} showDek />
            )}
          </div>
          {rest.length > 0 && (
            <ul role="list" className={styles.row}>
              {rest.map((a, i) => (
                <li key={a.id} data-reveal style={{ '--reveal-index': i + 1 } as React.CSSProperties}>
                  <StoryCard article={a} variant="text" size="s" now={now} showDek />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {layout === 'columns' && (
        <div className={styles.columns} data-count={Math.min(items.length, 3)}>
          <div data-reveal>
            <StoryCard article={first} variant={first.image ? 'standard' : 'text'} now={now} showDek />
          </div>
          {rest[0] && (
            <div data-reveal style={{ '--reveal-index': 1 } as React.CSSProperties}>
              <StoryCard article={rest[0]} variant={rest[0].image ? 'standard' : 'text'} size="s" now={now} showDek={!rest[0].image} />
            </div>
          )}
          {rest.length > 1 && (
            <ul role="list" className={styles.stack}>
              {rest.slice(1).map((a, i) => (
                <li key={a.id} data-reveal style={{ '--reveal-index': i + 2 } as React.CSSProperties}>
                  <StoryCard article={a} variant="text" size="s" now={now} showDek={i === 0} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {layout === 'headlines' && (
        <ul role="list" className={styles.headlines}>
          {items.map((a, i) => (
            <li key={a.id} data-reveal style={{ '--reveal-index': i } as React.CSSProperties}>
              <StoryCard article={a} variant="text" size="s" now={now} showDek={i === 0} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
