import styles from './Prose.module.css';

/** Contenedor de texto largo (páginas institucionales y legales). */
export function Prose({ children }: { children: React.ReactNode }) {
  return <div className={styles.prose}>{children}</div>;
}

/** Aviso de texto base: no es asesoramiento legal. */
export function LegalNotice({ updated }: { updated: string }) {
  return (
    <div className={styles.legalNotice} role="note">
      <p>
        <strong>Texto base para revisión.</strong> Este documento es un modelo inicial y no constituye asesoramiento jurídico.
        Antes de publicar el sitio, tiene que revisarlo un profesional matriculado según la jurisdicción donde opere el medio y
        los países desde donde lo visiten. Los datos entre corchetes los completa el responsable del medio.
      </p>
      <p className={styles.updated}>Última actualización del modelo: {updated}.</p>
    </div>
  );
}

/** Dato que solo puede completar el responsable del medio. */
export function Pending({ children }: { children: React.ReactNode }) {
  return <span className={styles.pending}>[{children}]</span>;
}
