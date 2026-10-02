'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { assuranceLevel, isEditor, onSessionChange, signOut, verifiedFactorId } from './api';
import { LoginForm } from './LoginForm';
import { SecondFactor } from './SecondFactor';
import { DraftList, type ListTab } from './DraftList';
import { DraftEditor } from './DraftEditor';
import type { SiteMode } from './model';
import { confirmLeave } from './unsaved';
import styles from './desk.module.css';

type Gate =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'not-editor'; email: string }
  /** Editor con la contraseña sola: falta el código de la app (o configurarla, sin `factorId`). */
  | { kind: 'second-factor'; email: string; factorId: string | null }
  | { kind: 'editor'; userId: string; email: string }
  | { kind: 'error'; message: string };

async function gateFor(session: Session | null): Promise<Gate> {
  if (!session) return { kind: 'signed-out' };
  const email = session.user.email ?? '';
  if (!(await isEditor(session.user.id))) return { kind: 'not-editor', email };
  const level = await assuranceLevel();
  if (level.current === 'aal2') return { kind: 'editor', userId: session.user.id, email };
  return { kind: 'second-factor', email, factorId: level.next === 'aal2' ? await verifiedFactorId() : null };
}

const TABS: ListTab[] = ['revision', 'publicadas', 'descartadas'];

/** Mesa de redacción: sesión, permiso de editor y qué pantalla mostrar según la dirección. */
export function Desk({ site }: { site: SiteMode }) {
  const params = useSearchParams();
  const [gate, setGate] = useState<Gate>({ kind: 'loading' });
  /** Usuario ya confirmado como editor. */
  const editorId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    // Supabase avisa la sesión inicial y cada cambio. La consulta a la base va fuera del aviso
    // (su documentación pide no llamar a Supabase dentro de ese callback).
    const stop = onSessionChange((session) => {
      // La renovación del token y la vuelta a la pestaña avisan otra vez la misma sesión: no se
      // vuelve a preguntar, así un corte de red en ese momento no cierra la nota que se edita.
      if (session && session.user.id === editorId.current) return;
      setTimeout(() => {
        gateFor(session).then(
          (next) => {
            if (!active) return;
            editorId.current = next.kind === 'editor' ? next.userId : null;
            setGate(next);
          },
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
  const email = gate.kind === 'editor' || gate.kind === 'not-editor' || gate.kind === 'second-factor' ? gate.email : null;

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
            <button type="button" className={styles.linkButton} onClick={() => confirmLeave() && void signOut()}>
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
        {gate.kind === 'second-factor' && <SecondFactor factorId={gate.factorId} />}
        {gate.kind === 'not-editor' && (
          <div className={styles.error} role="alert">
            <p>
              El usuario <strong>{gate.email}</strong> no forma parte de la redacción, así que no puede ver ni editar borradores.
            </p>
            <p>Si debería tener acceso, alguien con acceso a la base tiene que agregarlo a la tabla de editores.</p>
          </div>
        )}
        {gate.kind === 'editor' &&
          (noteId ? <DraftEditor key={noteId} id={noteId} site={site} /> : <DraftList key={tab} tab={tab} />)}
      </main>
    </>
  );
}
