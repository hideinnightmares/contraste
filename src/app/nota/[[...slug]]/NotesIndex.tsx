import Link from 'next/link';
import { Breadcrumbs } from '@/components/article/Breadcrumbs';
import { PageHeader } from '@/components/listing/PageHeader';
import styles from '../../listing.module.css';

/** `/nota` sin nota: no hay un listado propio, todas las notas están en Últimas noticias. */
export function NotesIndex() {
  return (
    <div className={`container ${styles.page}`}>
      <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: 'Notas', path: '/nota' }]} />
      <PageHeader title="Notas" description="Todas las notas de Contraste, de la más reciente a la más antigua, están en Últimas noticias." />
      <p className={styles.empty}>
        <Link href="/ultimas">Ir a Últimas noticias</Link>
      </p>
    </div>
  );
}
