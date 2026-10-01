'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import styles from './status.module.css';

/**
 * Error inesperado al renderizar una página. Muestra un mensaje claro y un
 * identificador para soporte; nunca el detalle técnico.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[contraste] Error de página', error);
  }, [error]);

  return (
    <div className={`container ${styles.wrap}`}>
      <p className={styles.code}>Error</p>
      <h1 className={styles.title}>No pudimos cargar esta página</h1>
      <p className={styles.text}>
        Fue un problema nuestro, no de tu conexión. Probá de nuevo en unos segundos.
        {error.digest && (
          <>
            {' '}
            Si sigue fallando, mencioná este código al escribirnos: <code>{error.digest}</code>.
          </>
        )}
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={reset} className={styles.primary}>
          Intentar de nuevo
        </button>
        <Link href="/" className={styles.secondary}>
          Ir a la portada
        </Link>
      </div>
    </div>
  );
}
