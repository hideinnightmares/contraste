import Link from 'next/link';
import { getCategory } from '@/config/categories';
import type { ArticleSummary, ArticleUpdate } from '@/domain/types';
import { formatFull } from '@/domain/dates';
import { slugify } from '@/domain/text';
import { articlePath, tagHref } from '@/lib/seo';
import styles from './ArticleExtras.module.css';

/** Temas de una nota. `counts`: cuántas notas tiene cada tema (por slug), para saber si tiene página propia. */
export function TagList({ tags, counts }: { tags: string[]; counts: Map<string, number> }) {
  if (tags.length === 0) return null;
  return (
    <div className={styles.tags}>
      <h2 className={styles.tagsTitle}>Temas</h2>
      <ul role="list" className={styles.tagList}>
        {tags.map((t) => (
          <li key={t}>
            <Link href={tagHref(slugify(t), counts.get(slugify(t)) ?? 0)} className={styles.tag}>
              {t}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UpdatesLog({ updates, publishedAt }: { updates: ArticleUpdate[]; publishedAt: string }) {
  if (updates.length === 0) return null;
  return (
    <section className={styles.updates} aria-labelledby="historial">
      <h2 id="historial" className={styles.sectionTitle}>
        Historial de cambios
      </h2>
      <ol className={styles.updateList}>
        {updates.map((u) => (
          <li key={u.at}>
            <time dateTime={u.at}>{formatFull(u.at)}</time>
            <p>{u.text}</p>
          </li>
        ))}
        <li>
          <time dateTime={publishedAt}>{formatFull(publishedAt)}</time>
          <p>Publicación original.</p>
        </li>
      </ol>
    </section>
  );
}

export function PrevNext({ previous, next }: { previous: ArticleSummary | null; next: ArticleSummary | null }) {
  if (!previous && !next) return null;
  return (
    <nav className={styles.prevNext} aria-label="Notas de la misma sección">
      {previous ? (
        <Link href={articlePath(previous.slug)} className={styles.pn} rel="prev" transitionTypes={['nav-back']}>
          <span className={styles.pnLabel}>Anterior en {getCategory(previous.category)?.name}</span>
          <span className={`${styles.pnTitle} headline-link`}>{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={articlePath(next.slug)} className={`${styles.pn} ${styles.pnNext}`} rel="next" transitionTypes={['nav-forward']}>
          <span className={styles.pnLabel}>Siguiente en {getCategory(next.category)?.name}</span>
          <span className={`${styles.pnTitle} headline-link`}>{next.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
