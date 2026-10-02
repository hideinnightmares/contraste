'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { categories } from '@/config/categories';
import { editorial } from '@/config/editorial';
import { formatFull } from '@/domain/dates';
import type { Article, ContentType, ReviewStatus } from '@/domain/types';
import { articlePath } from '@/lib/seo';
import { DeskError, loadDraft, saveDraft, type LoadedDraft } from './api';
import { BodyEditor } from './BodyEditor';
import { DraftPanels } from './DraftPanels';
import {
  applyFields,
  contentChanged,
  fieldsFrom,
  shownOnSite,
  validationIssues,
  whenVisible,
  withCorrection,
  withStatus,
  type EditableFields,
  type Issue,
  type SiteMode,
} from './model';
import { useUnsavedChangesGuard } from './unsaved';
import styles from './desk.module.css';

type Action = 'guardar' | 'publicar' | 'descartar' | 'revision' | 'despublicar';

const HEADING: Record<ReviewStatus, string> = {
  draft: 'Borrador',
  in_review: 'Nota en revisión',
  approved: 'Nota aprobada',
  rejected: 'Nota descartada',
  published: 'Nota publicada',
};

const TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: 'noticia', label: 'Noticia' },
  { value: 'analisis', label: 'Análisis' },
  { value: 'explicador', label: 'Qué se sabe' },
  { value: 'breve', label: 'Breve' },
];

const NEXT_STATUS: Partial<Record<Action, ReviewStatus>> = {
  publicar: 'published',
  descartar: 'rejected',
  revision: 'in_review',
  despublicar: 'in_review',
};

/** Lo que cambia el sitio a la vista de todos se confirma antes de mandarlo. */
type Confirmable = 'publicar' | 'despublicar';
const needsConfirmation = (action: Action): action is Confirmable => action === 'publicar' || action === 'despublicar';

function confirmationText(action: Confirmable, article: Article, site: SiteMode): string {
  if (action === 'despublicar') return `¿Despublicar esta nota? Sale del sitio y vuelve a revisión. ${whenVisible(article, site)}`;
  const disputed =
    article.verification.status === 'disputed'
      ? 'Las fuentes no coinciden en algún punto: confirmá que el texto lo explica sin dar ninguna versión por cierta. '
      : '';
  return `¿Publicar esta nota? ${disputed}${whenVisible(article, site)}`;
}

function successMessage(action: Action, article: Article, corrected: boolean, site: SiteMode): string {
  switch (action) {
    case 'publicar':
      return `Publicada. ${whenVisible(article, site)}`;
    case 'despublicar':
      return `Despublicada: volvió a revisión. ${whenVisible(article, site)}`;
    case 'descartar':
      return 'Descartada. Queda en la pestaña Descartadas por si hace falta recuperarla.';
    case 'revision':
      return 'Volvió a revisión.';
    case 'guardar':
      return corrected ? `Corrección publicada. ${whenVisible(article, site)}` : 'Cambios guardados.';
  }
}

type Load = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error'; message: string } | { kind: 'ready'; draft: LoadedDraft };

export function DraftEditor({ id, site }: { id: string; site: SiteMode }) {
  const fieldId = useId();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [fields, setFields] = useState<EditableFields | null>(null);
  const [correction, setCorrection] = useState('');
  const [busy, setBusy] = useState<Action | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [result, setResult] = useState<{ kind: 'success' | 'error'; text: string; conflict?: boolean } | null>(null);
  const [confirming, setConfirming] = useState<Confirmable | null>(null);
  const [attempt, setAttempt] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    loadDraft(id).then(
      (draft) => {
        if (!active) return;
        setLoad(draft ? { kind: 'ready', draft } : { kind: 'missing' });
        if (draft) setFields(fieldsFrom(draft.article));
      },
      (error: Error) => active && setLoad({ kind: 'error', message: error.message }),
    );
    return () => {
      active = false;
    };
  }, [id, attempt]);

  // El resultado de guardar se lleva el foco: el botón que se tocó puede haber desaparecido.
  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);

  const draft = load.kind === 'ready' ? load.draft : null;
  // Lo guardado pasado por la misma limpieza que el formulario (espacios de más, título para
  // buscadores): abrir una nota sin tocar nada no la marca como cambiada.
  const baseline = useMemo(() => (draft ? applyFields(draft.article, fieldsFrom(draft.article)) : null), [draft]);
  const dirty = Boolean(baseline && draft && fields && contentChanged(baseline, applyFields(draft.article, fields)));
  useUnsavedChangesGuard(dirty);

  if (load.kind === 'loading') return <p role="status">Cargando la nota…</p>;
  if (load.kind === 'missing') {
    return (
      <div className={styles.error} role="alert">
        <p>No existe una nota con esa dirección, o ya no tenés acceso.</p>
        <Link href="/redaccion">Volver a la lista</Link>
      </div>
    );
  }
  if (load.kind === 'error' || !draft || !fields || !baseline) {
    return (
      <div className={styles.error} role="alert">
        <p>No se pudo abrir la nota. {load.kind === 'error' ? load.message : ''}</p>
        <button type="button" className={styles.button} onClick={() => setAttempt((n) => n + 1)}>
          Reintentar
        </button>
      </div>
    );
  }

  const status = draft.article.review.status;
  const published = status === 'published';
  const set = <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => {
    setFields({ ...fields, [key]: value });
    // Lo que se confirmó era la versión anterior.
    setConfirming(null);
  };

  /** La nota como quedaría después de `action`, o lo que hay que resolver antes. */
  const prepare = (action: Action): { next: Article; correcting: boolean; issues: Issue[] } => {
    const now = new Date();
    let next = applyFields(draft.article, fields);
    const target = NEXT_STATUS[action];
    if (target) next = withStatus(next, target, now);
    // Una nota publicada solo se corrige dejando constancia pública (la base también lo exige).
    const correcting = published && target === undefined && contentChanged(baseline, next);
    if (correcting) {
      if (!correction.trim()) {
        const message = 'Explicá qué se corrigió: se publica en el historial de cambios de la nota.';
        return { next, correcting, issues: [{ field: 'Nota de corrección', message }] };
      }
      next = withCorrection(next, correction, now);
    }
    return { next, correcting, issues: validationIssues(next) };
  };

  const request = (action: Action) => {
    setResult(null);
    const prepared = prepare(action);
    setIssues(prepared.issues);
    if (prepared.issues.length > 0) {
      setConfirming(null);
      return;
    }
    if (needsConfirmation(action) && confirming !== action) {
      setConfirming(action);
      return;
    }
    setConfirming(null);
    void save(action, prepared.next, prepared.correcting);
  };

  const save = async (action: Action, next: Article, correcting: boolean) => {
    setBusy(action);
    try {
      const saved = await saveDraft(draft.id, draft.updatedAt, next);
      setLoad({ kind: 'ready', draft: saved });
      setFields(fieldsFrom(saved.article));
      setCorrection('');
      setResult({ kind: 'success', text: successMessage(action, saved.article, correcting, site) });
    } catch (error) {
      const conflict = error instanceof DeskError && error.kind === 'conflict';
      setResult({ kind: 'error', text: (error as Error).message, conflict });
    } finally {
      setBusy(null);
    }
  };

  /** Vuelve a leer la nota de la base y descarta lo que se estaba editando. */
  const reload = () => {
    setLoad({ kind: 'loading' });
    setResult(null);
    setIssues([]);
    setConfirming(null);
    setCorrection('');
    setAttempt((n) => n + 1);
  };

  const disabled = busy !== null;
  const confirmId = `${fieldId}-confirmar`;
  return (
    <>
      <p>
        <Link href="/redaccion" className={styles.linkButton}>
          Volver a la lista
        </Link>
      </p>
      <h1 className={styles.editorHeading}>{HEADING[status]}</h1>
      <p className={styles.meta}>
        {draft.article.isDemo && <span className={styles.badge}>Demo</span>}
        {draft.writer && <span>Redactó {draft.writer}</span>}
        <span>
          {published ? 'Publicada' : 'Fecha de la nota'}: {formatFull(draft.article.publishedAt)}
        </span>
        {published && shownOnSite(draft.article, site) && (
          <Link href={articlePath(draft.article.slug)} target="_blank">
            Ver en el sitio<span className="visually-hidden"> (abre en una pestaña nueva)</span>
          </Link>
        )}
      </p>

      <div className={styles.editor}>
        <DraftPanels article={draft.article} />

        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            request('guardar');
          }}
        >
          <div className={styles.field}>
            <label htmlFor={`${fieldId}-title`} className={styles.label}>
              Título
            </label>
            <textarea
              id={`${fieldId}-title`}
              className={`${styles.input} ${styles.titleInput}`}
              rows={2}
              value={fields.title}
              onChange={(e) => set('title', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={`${fieldId}-dek`} className={styles.label}>
              Bajada
            </label>
            <textarea id={`${fieldId}-dek`} className={styles.textarea} value={fields.dek} onChange={(e) => set('dek', e.target.value)} disabled={disabled} />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor={`${fieldId}-category`} className={styles.label}>
                Sección
              </label>
              <select
                id={`${fieldId}-category`}
                className={styles.select}
                value={fields.category}
                onChange={(e) => set('category', e.target.value)}
                disabled={disabled}
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor={`${fieldId}-type`} className={styles.label}>
                Formato
              </label>
              <select
                id={`${fieldId}-type`}
                className={styles.select}
                value={fields.type}
                onChange={(e) => set('type', e.target.value as ContentType)}
                disabled={disabled}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${fieldId}-tags`} className={styles.label}>
              Temas
            </label>
            <input
              id={`${fieldId}-tags`}
              className={styles.input}
              value={fields.tags}
              onChange={(e) => set('tags', e.target.value)}
              disabled={disabled}
              aria-describedby={`${fieldId}-tags-ayuda`}
            />
            <span id={`${fieldId}-tags-ayuda`} className={styles.hint}>
              Separados por comas. Hasta 8.
            </span>
          </div>

          <BodyEditor blocks={fields.body} onChange={(body) => set('body', body)} disabled={disabled} />

          <div className={styles.field}>
            <label htmlFor={`${fieldId}-seo`} className={styles.label}>
              Descripción para buscadores
            </label>
            <textarea
              id={`${fieldId}-seo`}
              className={styles.textarea}
              value={fields.seoDescription}
              onChange={(e) => set('seoDescription', e.target.value)}
              disabled={disabled}
              aria-describedby={`${fieldId}-seo-ayuda`}
            />
            <span id={`${fieldId}-seo-ayuda`} className={styles.hint}>
              {fields.seoDescription.length} de {editorial.seo.maxDescriptionLength} caracteres.
            </span>
          </div>

          {published && (
            <div className={styles.field}>
              <label htmlFor={`${fieldId}-correction`} className={styles.label}>
                Nota de corrección
              </label>
              <textarea
                id={`${fieldId}-correction`}
                className={styles.textarea}
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                disabled={disabled}
                aria-describedby={`${fieldId}-correction-ayuda`}
              />
              <span id={`${fieldId}-correction-ayuda`} className={styles.hint}>
                Obligatoria para cambiar una nota publicada: se muestra al pie de la nota, con la fecha. Por ejemplo: “Corregimos el monto
                de la licitación: son 150 millones, no 120”.
              </span>
            </div>
          )}

          {issues.length > 0 && (
            <div className={styles.error} role="alert">
              <p>Antes de guardar hay que resolver:</p>
              <ul className={styles.issues}>
                {issues.map((issue, i) => (
                  <li key={i}>
                    <strong>{issue.field}:</strong> {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result && (
            <div ref={resultRef} tabIndex={-1} className={result.kind === 'error' ? styles.error : styles.success} role={result.kind === 'error' ? 'alert' : 'status'}>
              <p>{result.text}</p>
              {result.conflict && (
                <button type="button" className={`${styles.button} ${styles.spacedSmall}`} onClick={reload}>
                  Recargar la nota
                </button>
              )}
            </div>
          )}

          <div className={styles.actions}>
            {confirming ? (
              <>
                <p id={confirmId} className={styles.confirmText}>
                  {confirmationText(confirming, draft.article, site)}
                </p>
                <button
                  type="button"
                  className={confirming === 'publicar' ? styles.publish : styles.danger}
                  disabled={disabled}
                  onClick={() => request(confirming)}
                  aria-describedby={confirmId}
                  autoFocus
                >
                  {confirming === 'publicar' ? 'Sí, publicar' : 'Sí, despublicar'}
                </button>
                <button type="button" className={styles.button} disabled={disabled} onClick={() => setConfirming(null)}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                {!published && status !== 'rejected' && (
                  <>
                    <button type="button" className={styles.publish} disabled={disabled} onClick={() => request('publicar')}>
                      {busy === 'publicar' ? 'Publicando…' : 'Publicar'}
                    </button>
                    <button type="submit" className={styles.primary} disabled={disabled || !dirty}>
                      {busy === 'guardar' ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    <button type="button" className={styles.danger} disabled={disabled} onClick={() => request('descartar')}>
                      {busy === 'descartar' ? 'Descartando…' : 'Descartar'}
                    </button>
                  </>
                )}
                {status === 'rejected' && (
                  <>
                    <button type="button" className={styles.primary} disabled={disabled} onClick={() => request('revision')}>
                      {busy === 'revision' ? 'Guardando…' : 'Volver a revisión'}
                    </button>
                    <button type="submit" className={styles.button} disabled={disabled || !dirty}>
                      {busy === 'guardar' ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  </>
                )}
                {published && (
                  <>
                    <button type="submit" className={styles.primary} disabled={disabled || !dirty}>
                      {busy === 'guardar' ? 'Publicando la corrección…' : 'Publicar la corrección'}
                    </button>
                    <button type="button" className={styles.danger} disabled={disabled} onClick={() => request('despublicar')}>
                      {busy === 'despublicar' ? 'Despublicando…' : 'Despublicar'}
                    </button>
                  </>
                )}
                {dirty && <span className={styles.hint}>Hay cambios sin guardar.</span>}
              </>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
