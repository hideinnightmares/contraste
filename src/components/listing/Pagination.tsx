import Link from 'next/link';
import styles from './Pagination.module.css';

/** Paginación con enlaces reales (funciona sin JavaScript y es rastreable). */
export function Pagination({
  page,
  pageSize,
  total,
  href,
}: {
  page: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return (
    <nav className={styles.nav} aria-label="Páginas de resultados">
      {page > 1 ? (
        <Link href={href(page - 1)} className={styles.step} rel="prev">
          Más recientes
        </Link>
      ) : (
        <span />
      )}
      <p className={styles.status}>
        Página {page} de {pages}
      </p>
      {page < pages ? (
        <Link href={href(page + 1)} className={styles.step} rel="next">
          Más antiguas
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
