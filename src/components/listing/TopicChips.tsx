import Link from 'next/link';
import { tagHref } from '@/lib/seo';
import styles from './TopicChips.module.css';

/** Temas con su cantidad de notas. Cada uno lleva a su página o, si es chico, a la búsqueda filtrada. */
export function TopicChips({ topics }: { topics: { slug: string; name: string; count: number }[] }) {
  return (
    <ul role="list" className={styles.list}>
      {topics.map((t) => (
        <li key={t.slug}>
          <Link href={tagHref(t.slug, t.count)} className={styles.chip}>
            {t.name}
            <span className={styles.count}>{t.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
