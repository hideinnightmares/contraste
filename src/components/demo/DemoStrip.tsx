import styles from './Demo.module.css';

/** Marca "Demo" junto a la sección de cada nota ficticia. */
export function DemoTag() {
  return (
    <span className={styles.tag} title="Nota ficticia de demostración">
      Demo
    </span>
  );
}

/** Aviso al comienzo de cada nota ficticia. */
export function DemoNotice() {
  return (
    <div className={styles.notice} role="note">
      <p>
        <strong>Esta nota es ficticia.</strong> La escribimos para mostrar cómo se ve una nota en Contraste: los hechos, las
        cifras y las fuentes citadas no existen. Las fuentes enlazan a direcciones de ejemplo.
      </p>
    </div>
  );
}
