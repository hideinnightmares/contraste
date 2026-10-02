import Link from 'next/link';
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup';
import styles from '@/app/listing.module.css';

/**
 * Portada sin notas publicadas (por ejemplo, el día del lanzamiento): un mensaje claro en
 * lugar de bloques vacíos y espacios de publicidad sin contenido alrededor.
 */
export function EmptyFront() {
  return (
    <>
      <div className={`container ${styles.page}`}>
        <p className={styles.empty}>
          Todavía no hay notas publicadas. La primera aparece acá apenas la redacción la apruebe. Mientras tanto, podés leer{' '}
          <Link href="/metodologia">cómo trabajamos</Link>: cómo elegimos las fuentes y cuándo una noticia está verificada.
        </p>
      </div>
      <NewsletterSignup />
    </>
  );
}
