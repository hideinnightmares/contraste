'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { newsletter } from '@/config/newsletter';
import styles from './NewsletterSignup.module.css';

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string; field?: 'email' | 'consent' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Franja del newsletter en la portada: el formulario si está habilitado; si no, el RSS. */
export function NewsletterSignup() {
  return newsletter.endpoint ? <SignupForm endpoint={newsletter.endpoint} /> : <NewsletterUnavailable />;
}

/** Sin newsletter todavía: no se muestra un formulario que no podría guardar nada. */
function NewsletterUnavailable() {
  const id = useId();
  return (
    <section className={`highlight-band ${styles.section}`} aria-labelledby={`${id}-title`} id="newsletter">
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <h2 id={`${id}-title`} className={styles.title}>
            Seguí Contraste por RSS.
          </h2>
          <p className={styles.purpose}>
            El newsletter por email todavía no está habilitado. Mientras tanto, el feed RSS trae cada nota apenas se publica,
            en cualquier lector de noticias.
          </p>
        </div>
        <p className={styles.alternative}>
          <a href="/rss.xml" className={styles.button}>
            Abrir el feed RSS
          </a>
        </p>
      </div>
    </section>
  );
}

/**
 * Suscripción al newsletter. Pide solo el email y un consentimiento explícito,
 * sin casillas premarcadas. Valida en el navegador para dar respuesta inmediata,
 * pero la validación que cuenta es la de `endpoint`.
 */
function SignupForm({ endpoint }: { endpoint: string }) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const emailRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const emailId = `${id}-email`;
  const consentId = `${id}-consent`;
  const errorId = `${id}-error`;
  const purposeId = `${id}-purpose`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (new FormData(form).get('email') as string).trim();
    const consent = consentRef.current?.checked ?? false;

    if (!EMAIL_RE.test(email)) {
      setState({ kind: 'error', field: 'email', message: 'Revisá el email: tiene que tener la forma nombre@dominio.com.' });
      emailRef.current?.focus();
      return;
    }
    if (!consent) {
      setState({ kind: 'error', field: 'consent', message: 'Para suscribirte, marcá la casilla de consentimiento.' });
      consentRef.current?.focus();
      return;
    }

    setState({ kind: 'submitting' });
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent: true, consentTextVersion: 1, website: (new FormData(form).get('website') as string) ?? '' }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; field?: 'email' | 'consent' };
      if (!res.ok) {
        setState({ kind: 'error', field: data.field, message: data.message ?? 'No pudimos registrar la suscripción. Probá de nuevo en unos minutos.' });
        return;
      }
      form.reset();
      setState({ kind: 'success', message: data.message ?? 'Listo. Revisá tu correo para confirmar la suscripción.' });
    } catch {
      setState({ kind: 'error', message: 'No hay conexión. Revisá tu red y probá de nuevo.' });
    }
  }

  const submitting = state.kind === 'submitting';
  const error = state.kind === 'error' ? state : null;

  return (
    <section className={`highlight-band ${styles.section}`} aria-labelledby={`${id}-title`} id="newsletter">
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <h2 id={`${id}-title`} className={styles.title}>
            Las noticias que importan, directo en tu correo.
          </h2>
          <p id={purposeId} className={styles.purpose}>
            Un resumen por día hábil con las notas verificadas más importantes. Usamos tu email solo para enviarte este
            newsletter: no lo compartimos ni lo usamos para publicidad. Podés darte de baja desde cualquier envío.
          </p>
        </div>

        {state.kind === 'success' ? (
          <div className={styles.success} role="status">
            <span className={styles.successIcon} aria-hidden="true">
              <Check size={20} strokeWidth={2.25} />
            </span>
            <p>{state.message}</p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={onSubmit} noValidate aria-describedby={purposeId}>
            <div className={styles.row}>
              <label htmlFor={emailId} className={styles.label}>
                Email
              </label>
              <div className={styles.inputRow}>
                <input
                  ref={emailRef}
                  id={emailId}
                  className={styles.input}
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  maxLength={254}
                  placeholder="nombre@dominio.com"
                  aria-invalid={error?.field === 'email' || undefined}
                  aria-describedby={error?.field === 'email' ? errorId : undefined}
                  disabled={submitting}
                />
                <button type="submit" className={styles.button} disabled={submitting} aria-busy={submitting}>
                  {submitting ? (
                    <>
                      <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" />
                      <span>Enviando…</span>
                    </>
                  ) : (
                    'Suscribirme'
                  )}
                </button>
              </div>
            </div>

            {/* Trampa para bots: invisible para personas, ignorada por lectores de pantalla. */}
            <div className={styles.trap} aria-hidden="true">
              <label>
                No completar
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <div className={styles.consent}>
              <input
                ref={consentRef}
                id={consentId}
                type="checkbox"
                name="consent"
                className={styles.checkbox}
                aria-invalid={error?.field === 'consent' || undefined}
                aria-describedby={error?.field === 'consent' ? errorId : undefined}
                disabled={submitting}
              />
              <label htmlFor={consentId}>
                Acepto recibir el newsletter de Contraste en este email y leí la{' '}
                <Link href="/privacidad#newsletter" className={styles.link}>
                  política de privacidad
                </Link>
                .
              </label>
            </div>

            <p id={errorId} className={styles.error} role="alert">
              {error?.message}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
