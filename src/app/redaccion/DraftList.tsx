'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCategory } from '@/config/categories';
import { formatPublished } from '@/domain/dates';
import { verificationLabel } from '@/domain/labels';
import type { ReviewStatus, VerificationStatus } from '@/domain/types';
import { listDrafts, type DraftRow } from './api';
import styles from './desk.module.css';

export type ListTab = 'revision' | 'publicadas' | 'descartadas';

const TAB: Record<ListTab, { label: string; statuses: ReviewStatus[]; empty: string }> = {
  revision: {
    label: 'Para revisar',
    statuses: ['in_review', 'approved', 'draft'],
    empty: 'No hay borradores para revisar. Los nuevos aparecen acá cuando corre el pipeline.',
  },
  publicadas: { label: 'Publicadas', statuses: ['published'], empty: 'Todavía no hay notas publicadas.' },
  descartadas: { label: 'Descartadas', statuses: ['rejected'], empty: 'No hay notas descartadas.' },
};

export const STATUS_LABEL: Record<ReviewStatus, string> = {
  draft: 'Borrador',
  in_review: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Descartada',
  published: 'Publicada',
};

type State = { kind: 'loading' } | { kind: 'ready'; rows: DraftRow[] } | { kind: 'error'; message: string };

export function DraftList({ tab }: { tab: ListTab }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const now = new Date();

  useEffect(() => {
    let active = true;
    listDrafts(TAB[tab].statuses).then(
      (rows) => active && setState({ kind: 'ready', rows }),
      (error: Error) => active && setState({ kind: 'error', message: error.message }),
    );
    return () => {
      active = false;
    };
  }, [tab, attempt]);

  return (
    <>
      <h1 className={styles.title}>Notas</h1>
      <nav className={styles.tabs} aria-label="Estado de las notas">
        {(Object.keys(TAB) as ListTab[]).map((t) => (
          <Link
            key={t}
            href={t === 'revision' ? '/redaccion' : `/redaccion?estado=${t}`}
            className={styles.tab}
            aria-current={t === tab ? 'page' : undefined}
          >
            {TAB[t].label}
          </Link>
        ))}
      </nav>

      {state.kind === 'loading' && (
        <p role="status" className={styles.empty}>
          Cargando…
        </p>
      )}
      {state.kind === 'error' && (
        <div className={`${styles.error} ${styles.spaced}`} role="alert">
          <p>No se pudo cargar la lista. {state.message}</p>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              setState({ kind: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      {state.kind === 'ready' && state.rows.length === 0 && <p className={styles.empty}>{TAB[tab].empty}</p>}
      {state.kind === 'ready' && state.rows.length > 0 && (
        <ul role="list" className={styles.list}>
          {state.rows.map((row) => (
            <li key={row.id} className={styles.item}>
              <h2 className={styles.itemTitle}>
                <Link href={`/redaccion?nota=${row.id}`}>{row.title}</Link>
              </h2>
              <p className={styles.meta}>
                <span>{STATUS_LABEL[row.status]}</span>
                <span>{getCategory(row.category)?.name ?? row.category}</span>
                {row.verification && <span>{verificationLabel[row.verification as VerificationStatus]?.short ?? row.verification}</span>}
                <span>Actualizada {formatPublished(row.updatedAt, now).toLowerCase()}</span>
                {row.writer && <span>Redactó {row.writer}</span>}
                {row.isDemo && <span className={styles.badge}>Demo</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
