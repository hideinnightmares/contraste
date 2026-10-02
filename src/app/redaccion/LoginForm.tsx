'use client';

import { useId, useState } from 'react';
import { signIn } from './api';
import styles from './desk.module.css';

/** Inicio de sesión de la redacción. Las cuentas se crean desde el panel de Supabase, no acá. */
export function LoginForm() {
  const id = useId();
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; message: string }>({ kind: 'idle' });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState({ kind: 'sending' });
    try {
      await signIn(String(data.get('email') ?? ''), String(data.get('password') ?? ''));
      // La sesión nueva la recibe Desk por onSessionChange.
    } catch (error) {
      setState({ kind: 'error', message: (error as Error).message });
    }
  }

  const sending = state.kind === 'sending';
  return (
    <div className={styles.login}>
      <h1 className={styles.title}>Mesa de redacción</h1>
      <p className={styles.lead}>Para revisar, corregir y publicar borradores. Solo para la redacción de Contraste.</p>
      <form className={`${styles.form} ${styles.spaced}`} onSubmit={onSubmit}>
        <div className={styles.field}>
          <label htmlFor={`${id}-email`} className={styles.label}>
            Email
          </label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="username" required className={styles.input} disabled={sending} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-password`} className={styles.label}>
            Contraseña
          </label>
          <input
            id={`${id}-password`}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={styles.input}
            disabled={sending}
          />
        </div>
        {state.kind === 'error' && (
          <p className={styles.error} role="alert">
            {state.message}
          </p>
        )}
        <button type="submit" className={styles.primary} disabled={sending} aria-busy={sending}>
          {sending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
