'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isEditor, onSessionChange, signOut } from './api';
import { LoginForm } from './LoginForm';
import { DraftList, type ListTab } from './DraftList';
import { DraftEditor } from './DraftEditor';
import styles from './desk.module.css';

type Gate =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'not-editor'; email: string }
  | { kind: 'editor'; session: Session }
  | { kind: 'error'; message: string };

async function gateFor(session: Session | null): Promise<Gate> {
  if (!session) return { kind: 'signed-out' };
  return (await isEditor(session.user.id)) ? { kind: 'editor', session } : { kind: 'not-editor', email: session.user.email ?? '' };
}

const TABS: ListTab[] = ['revision', 'publicadas', 'descartadas'];

/** Mesa de redacción: sesión, permiso de editor y qué pantalla mostrar según la dirección. */
export function Desk() {
  const params = useSearchParams();
  const [gate, setGate] = useState<Gate>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    // Supabase avisa la sesión inicial y cada cambio. La consulta a la base va fuera del aviso
    // (su documentación pide no llamar a Supabase dentro de ese callback).
    const stop = onSessionChange((session) => {
      setTimeout(() => {
        gateFor(session).then(
          (next) => active && setGate(next),
          (error: Error) => active && setGate({ kind: 'error', message: error.message }),
        );
      }, 0);
    });
    return () => {
      active = false;
      stop();
    };
  }, []);

  const noteId = params.get('nota');
  const tabParam = params.get('estado');
  const tab: ListTab = TABS.includes(tabParam as ListTab) ? (tabParam as ListTab) : 'revision';
  const email = gate.kind === 'editor' ? gate.session.user.email : gate.kind === 'not-editor' ? gate.email : null;

  return (
    <>
      <header className={`${styles.bar} invert`}>
        <Link href="/redaccion" className={styles.brand}>
          Contraste<span>Redacción</span>
        </Link>
        <div className={styles.barActions}>
          {email && <span className={styles.barUser}>{email}</span>}
          <Link href="/">Ver el sitio</Link>
          {email && (
            <button type="button" className={styles.linkButton} onClick={() => void signOut()}>
              Cerrar sesión
            </button>
          )}
        </div>
      </header>

      <main id="contenido" className={styles.main}>
        {gate.kind === 'loading' && <p role="status">Comprobando la sesión…</p>}
        {gate.kind === 'error' && (
          <p className={styles.error} role="alert">
            No se pudo comprobar la sesión: {gate.message}
          </p>
        )}
        {gate.kind === 'signed-out' && <LoginForm />}
        {gate.kind === 'not-editor' && (
          <div className={styles.error} role="alert">
            <p>
              El usuario <strong>{gate.email}</strong> no forma parte de la redacción, así que no puede ver ni editar borradores.
            </p>
            <p>Si debería tener acceso, alguien con acceso a la base tiene que agregarlo a la tabla de editores.</p>
          </div>
        )}
        {gate.kind === 'editor' && (noteId ? <DraftEditor key={noteId} id={noteId} /> : <DraftList key={tab} tab={tab} />)}
      </main>
    </>
  );
}
