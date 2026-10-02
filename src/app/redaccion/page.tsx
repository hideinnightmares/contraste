import { Suspense } from 'react';
import { Desk } from './Desk';
import styles from './desk.module.css';

/**
 * La página es estática; la mesa entera corre en el navegador con la sesión del editor
 * (los criterios van en la dirección: /redaccion?estado=… y /redaccion?nota=…).
 */
export default function DeskPage() {
  return (
    <Suspense fallback={<p className={styles.main}>Cargando la mesa de redacción…</p>}>
      <Desk />
    </Suspense>
  );
}
