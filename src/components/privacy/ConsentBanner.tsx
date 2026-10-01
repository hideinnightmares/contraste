'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { consentCategories } from '@/config/privacy';
import { isAdSenseConfigured } from '@/config/ads';
import { site } from '@/config/site';
import { useConsent } from './ConsentProvider';
import styles from './ConsentBanner.module.css';

/**
 * Aviso de cookies y panel de preferencias.
 *
 * - Aparece solo si hay algo que pedir: publicidad o medición configuradas. En modo
 *   demostración aparece igual, para poder probarlo, y lo dice.
 * - "Rechazar" y "Aceptar" tienen el mismo peso visual; no hay casillas premarcadas.
 * - No bloquea la lectura: el sitio se usa normalmente sin decidir.
 */
export function ConsentBanner() {
  const { consent, save, preferencesOpen, openPreferences, closePreferences } = useConsent();
  const needsConsent = isAdSenseConfigured() || site.demoMode;
  const showBanner = needsConsent && consent === null && !preferencesOpen;
  const titleId = useId();

  return (
    <>
      {showBanner && (
        <section className={styles.banner} aria-labelledby={titleId}>
          <h2 id={titleId} className={styles.title}>
            Tu privacidad
          </h2>
          <p className={styles.text}>
            Usamos almacenamiento propio para recordar tus preferencias. Con tu permiso, también usaríamos cookies para
            medir audiencia y mostrar publicidad personalizada.{' '}
            {site.demoMode && !isAdSenseConfigured() && (
              <>En esta demo no hay ninguna herramienta de terceros instalada: tu elección se guarda y se aplicaría al activarlas. </>
            )}
            <Link href="/cookies" className={styles.link}>
              Política de cookies
            </Link>
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={() => save({ analytics: false, advertising: false })}>
              Rechazar
            </button>
            <button type="button" className={styles.button} onClick={() => save({ analytics: true, advertising: true })}>
              Aceptar
            </button>
            <button type="button" className={styles.textButton} onClick={openPreferences}>
              Elegir qué permitir
            </button>
          </div>
        </section>
      )}
      <PreferencesDialog
        open={preferencesOpen}
        initial={consent ?? null}
        onClose={closePreferences}
        onSave={save}
      />
    </>
  );
}

function PreferencesDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: { analytics: boolean; advertising: boolean } | null;
  onClose: () => void;
  onSave: (c: { analytics: boolean; advertising: boolean }) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      // Sincroniza el formulario con la decisión guardada cada vez que se abre.
      setAnalytics(initial?.analytics ?? false);
      setAdvertising(initial?.advertising ?? false);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, initial]);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}>
      <form
        method="dialog"
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ analytics, advertising });
        }}
      >
        <h2 id={titleId} className={styles.dialogTitle}>
          Preferencias de privacidad
        </h2>
        <p className={styles.dialogText}>
          Elegí qué permitís. Podés cambiarlo cuando quieras desde “Preferencias de cookies”, al pie de cada página.
        </p>
        <ul role="list" className={styles.options}>
          <li className={styles.option}>
            <div>
              <p className={styles.optionName}>{consentCategories.necessary.name}</p>
              <p className={styles.optionText}>{consentCategories.necessary.description}</p>
            </div>
            <span className={styles.always}>Siempre activas</span>
          </li>
          <li className={styles.option}>
            <label className={styles.optionLabel}>
              <span>
                <span className={styles.optionName}>{consentCategories.analytics.name}</span>
                <span className={styles.optionText}>{consentCategories.analytics.description}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className={styles.switch}
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
            </label>
          </li>
          <li className={styles.option}>
            <label className={styles.optionLabel}>
              <span>
                <span className={styles.optionName}>{consentCategories.advertising.name}</span>
                <span className={styles.optionText}>{consentCategories.advertising.description}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className={styles.switch}
                checked={advertising}
                onChange={(e) => setAdvertising(e.target.checked)}
              />
            </label>
          </li>
        </ul>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.textButton} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={styles.buttonPrimary}>
            Guardar preferencias
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** Botón del pie de página que reabre las preferencias. */
export function CookiePreferencesButton({ className }: { className?: string }) {
  const { openPreferences } = useConsent();
  return (
    <button type="button" className={className} onClick={openPreferences}>
      Preferencias de cookies
    </button>
  );
}
