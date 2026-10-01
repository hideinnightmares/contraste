import styles from './Skeleton.module.css';

/** Esqueletos de carga. Se anuncian una sola vez como "Cargando" y el resto es decorativo. */
export function ArticleSkeleton() {
  return (
    <div className={`container ${styles.article}`} role="status" aria-live="polite">
      <span className="visually-hidden">Cargando la nota…</span>
      <div aria-hidden="true" className={styles.stack}>
        <span className={`${styles.bone} ${styles.kicker}`} />
        <span className={`${styles.bone} ${styles.title}`} />
        <span className={`${styles.bone} ${styles.title} ${styles.short}`} />
        <span className={`${styles.bone} ${styles.line}`} />
        <span className={`${styles.bone} ${styles.line} ${styles.mid}`} />
        <span className={`${styles.bone} ${styles.hero}`} />
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={`${styles.bone} ${styles.line}`} />
        ))}
      </div>
    </div>
  );
}

function Rows({ count }: { count: number }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className={styles.row}>
      <div className={styles.stack}>
        <span className={`${styles.bone} ${styles.kicker}`} />
        <span className={`${styles.bone} ${styles.rowTitle}`} />
        <span className={`${styles.bone} ${styles.line}`} />
      </div>
      <span className={`${styles.bone} ${styles.thumb}`} />
    </div>
  ));
}

export function ListSkeleton({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className={`container ${styles.list}`} role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      <div aria-hidden="true" className={styles.stack}>
        <span className={`${styles.bone} ${styles.pageTitle}`} />
        <span className={`${styles.bone} ${styles.line} ${styles.mid}`} />
        <Rows count={4} />
      </div>
    </div>
  );
}

/** Solo las filas de un listado, para un bloque de resultados dentro de una página. */
export function RowsSkeleton({ label = 'Cargando…', count = 3 }: { label?: string; count?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      <div aria-hidden="true" className={styles.stack}>
        <Rows count={count} />
      </div>
    </div>
  );
}
