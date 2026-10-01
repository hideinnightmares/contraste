import Link from 'next/link';
import styles from './status.module.css';

export default function NotFound() {
  return (
    <div className={`container ${styles.wrap}`}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Esta página no existe</h1>
      <p className={styles.text}>
        Puede que la nota haya cambiado de dirección o que el enlace tenga un error. Buscala por tema o volvé a la portada.
      </p>
      <div className={styles.actions}>
        <Link href="/" className={styles.primary}>
          Ir a la portada
        </Link>
        <Link href="/buscar" className={styles.secondary}>
          Buscar una nota
        </Link>
      </div>
    </div>
  );
}
