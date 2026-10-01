import Link from 'next/link';
import { getCategory } from '@/config/categories';
import type { ArticleSummary } from '@/domain/types';
import { articlePath } from '@/lib/seo';
import styles from './MostRead.module.css';

/**
 * Más leídas. Es un ranking, así que lleva números. Si el orden no viene de
 * datos reales de lectura, lo decimos debajo del título. Nunca mostramos
 * cantidades de visitas.
 */
export function MostRead({ items, simulated }: { items: ArticleSummary[]; simulated: boolean }) {
  if (items.length === 0) return null;
  return (
    <section className={styles.box} aria-labelledby="mas-leidas">
      <h2 id="mas-leidas" className={styles.title}>
        Más leídas
      </h2>
      {simulated && (
        <p className={styles.note}>Orden elegido a mano para la demostración: todavía no medimos lecturas.</p>
      )}
      <ol className={styles.list}>
        {items.map((a, i) => (
          <li key={a.id} className={`story ${styles.item}`} data-reveal style={{ '--reveal-index': i } as React.CSSProperties}>
            <span className={styles.rank} aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <p className={styles.section}>{getCategory(a.category)?.name}</p>
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
