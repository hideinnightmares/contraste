import { Suspense } from 'react';
import { site } from '@/config/site';
import { Desk } from './Desk';
import type { SiteMode } from './model';
import styles from './desk.module.css';

/**
 * La página es estática; la mesa entera corre en el navegador con la sesión del editor
 * (los criterios van en la dirección: /redaccion?estado=… y /redaccion?nota=…).
 */
export default function DeskPage() {
  // Cómo se arma este mismo sitio: la mesa lo usa para decir cuándo se va a ver lo publicado.
  const siteMode: SiteMode = { readsDatabase: process.env.CONTENT_SOURCE === 'database', demoMode: site.demoMode };
  return (
    <Suspense fallback={<p className={styles.main}>Cargando la mesa de redacción…</p>}>
      <Desk site={siteMode} />
    </Suspense>
  );
}
