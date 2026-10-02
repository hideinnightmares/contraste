'use client';

import { useId, useState } from 'react';
import { startEnrollment, verifyCode, type Enrollment } from './api';
import styles from './desk.module.css';

type Status = { kind: 'idle' } | { kind: 'working' } | { kind: 'error'; message: string };

/**
 * Segundo paso del ingreso. Con `factorId`, pide el código de la app de autenticación; sin él,
 * la configura (código QR o clave) y la activa con el primer código. Cuando el código es
 * correcto, Supabase avisa la sesión nueva y la mesa (Desk) abre la redacción.
 */
export function SecondFactor({ factorId }: { factorId: string | null }) {
  const id = useId();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const working = status.kind === 'working';
  const activeFactor = factorId ?? enrollment?.factorId ?? null;

  async function begin() {
    setStatus({ kind: 'working' });
    try {
      setEnrollment(await startEnrollment());
      setStatus({ kind: 'idle' });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFactor) return;
    const code = String(new FormData(event.currentTarget).get('code') ?? '');
    setStatus({ kind: 'working' });
    try {
      await verifyCode(activeFactor, code);
      // La mesa recibe la sesión nueva y reemplaza esta pantalla.
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  const error = status.kind === 'error' && (
    <p className={styles.error} role="alert">
      {status.message}
    </p>
  );

  const codeForm = (
    <form className={`${styles.form} ${styles.spaced}`} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label htmlFor={`${id}-code`} className={styles.label}>
          Código de 6 dígitos
        </label>
        <input
          id={`${id}-code`}
          name="code"
          className={`${styles.input} ${styles.codeInput}`}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          required
          disabled={working}
          aria-describedby={`${id}-code-ayuda`}
        />
        <span id={`${id}-code-ayuda`} className={styles.hint}>
          Lo muestra la app de autenticación y cambia cada 30 segundos.
        </span>
      </div>
      {error}
      <button type="submit" className={styles.primary} disabled={working} aria-busy={working}>
        {working ? 'Comprobando…' : factorId ? 'Entrar' : 'Activar y entrar'}
      </button>
    </form>
  );

  if (factorId) {
    return (
      <div className={styles.login}>
        <h1 className={styles.title}>Verificación en dos pasos</h1>
        <p className={styles.lead}>Abrí la app de autenticación de tu teléfono e ingresá el código de Contraste.</p>
        {codeForm}
      </div>
    );
  }

  return (
    <div className={styles.login}>
      <h1 className={styles.title}>Activá la verificación en dos pasos</h1>
      <p className={styles.lead}>
        Para entrar a la redacción, además de la contraseña hace falta un código que genera una app en tu teléfono. Así, una
        contraseña robada no alcanza para publicar en nombre del diario.
      </p>
      {!enrollment ? (
        <>
          <ol className={`${styles.steps} ${styles.spaced}`}>
            <li>Instalá una app de autenticación: Google Authenticator, Microsoft Authenticator, 1Password u otra.</li>
            <li>Tocá “Configurar la app” y escaneá el código QR con ella.</li>
            <li>Ingresá el código de 6 dígitos que muestra la app.</li>
          </ol>
          {error}
          <button type="button" className={`${styles.primary} ${styles.spaced}`} onClick={() => void begin()} disabled={working} aria-busy={working}>
            {working ? 'Preparando…' : 'Configurar la app'}
          </button>
        </>
      ) : (
        <>
          <div className={`${styles.qr} ${styles.spaced}`}>
            {/* El QR lo genera Supabase como SVG; next/image no sirve para data URLs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrollment.qrCode} alt="Código QR para agregar Contraste a la app de autenticación" width={200} height={200} />
          </div>
          <p className={`${styles.hint} ${styles.spacedSmall}`}>
            Si no podés escanearlo, cargá esta clave a mano: <code className={styles.secret}>{enrollment.secret}</code>
          </p>
          {codeForm}
        </>
      )}
    </div>
  );
}
