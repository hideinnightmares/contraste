import Link from 'next/link';
import { breadcrumbJsonLd, serializeJsonLd } from '@/lib/seo';
import styles from './Breadcrumbs.module.css';

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <>
      <nav aria-label="Ruta de navegación" className={styles.nav}>
        <ol className={styles.list}>
          {items.map((item, i) => {
            const last = i === items.length - 1;
            return (
              <li key={item.path} className={styles.item}>
                {last ? (
                  <span aria-current="page" className={styles.current}>
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.path} className={styles.link}>
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd(items)) }} />
    </>
  );
}
