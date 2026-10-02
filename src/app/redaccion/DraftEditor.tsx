'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { categories } from '@/config/categories';
import { formatFull } from '@/domain/dates';
import type { Article, ContentType, ReviewStatus } from '@/domain/types';
import { articlePath } from '@/lib/seo';
import { DeskError, loadDraft, saveDraft, type LoadedDraft } from './api';
import { BodyEditor } from './BodyEditor';
import { DraftPanels } from './DraftPanels';
import { STATUS_LABEL } from './DraftList';
import {
  applyFields,
  contentChanged,
  fieldsFrom,
  validationIssues,
  withCorrection,
  withStatus,
  type EditableFields,
  type Issue,
} from './model';
import styles from './desk.module.css';

type Action = 'guardar' | 'publicar' | 'descartar' | 'revision' | 'despublicar';

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

function successMessage(action: Action, article: Article, corrected: boolean): string {
  const rebuild = article.isDemo ? 'Es de demostración: no se muestra en el sitio con contenido real.' : 'El sitio se está rearmando: el cambio aparece en unos minutos.';
  switch (action) {
    case 'publicar':
      return `Publicada. ${rebuild}`;
    case 'despublicar':
      return `Despublicada y de vuelta en revisión. ${rebuild}`;
    case 'descartar':
      return 'Descartada. Queda en la pestaña Descartadas por si hace falta recuperarla.';
    case 'revision':
      return 'Volvió a revisión.';
    case 'guardar':
      return corrected ? `Corrección publicada. ${rebuild}` : 'Cambios guardados.';
  }
}

type Load = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error'; message: string } | { kind: 'ready'; draft: LoadedDraft };

export function DraftEditor({ id }: { id: string }) {
  const fieldId = useId();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [fields, setFields] = useState<EditableFields | null>(null);
  const [correction, setCorrection] = useState('');
  const [busy, setBusy] = useState<Action | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [result, setResult] = useState<{ kind: 'success' | 'error'; text: string; conflict?: boolean } | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [attempt, setAttempt] = useState(0);

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

  const draft = load.kind === 'ready' ? load.draft : null;
  const dirty = Boolean(draft && fields && contentChanged(draft.article, applyFields(draft.article, fields)));

  // Avisa antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (load.kind === 'loading') return <p role="status">Cargando la nota…</p>;
  if (load.kind === 'missing') {
    return (
      <div className={styles.error} role="alert">
        <p>No existe una nota con esa dirección, o ya no tenés acceso.</p>
        <Link href="/redaccion">Volver a la lista</Link>
      </div>
    );
  }
  if (load.kind === 'error' || !draft || !fields) {
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
  const set = <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => setFields({ ...fields, [key]: value });

  async function perform(action: Action) {
    if (!draft || !fields) return;
    setResult(null);
    setConfirmUnpublish(false);
    let next = applyFields(draft.article, fields);
    const target = NEXT_STATUS[action];
    if (target) next = withStatus(next, target);

    // Una nota publicada solo se corrige dejando constancia pública (la base también lo exige).
    const correcting = published && target === undefined && contentChanged(draft.article, next);
    if (correcting) {
      if (!correction.trim()) {
        setIssues([{ field: 'Nota de corrección', message: 'Explicá qué se corrigió: se publica en el historial de cambios de la nota.' }]);
        return;
      }
      next = withCorrection(next, correction, new Date());
    }

    const problems = validationIssues(next);
    setIssues(problems);
    if (problems.length > 0) return;

    setBusy(action);
    try {
      const saved = await saveDraft(draft.id, draft.updatedAt, next);
      setLoad({ kind: 'ready', draft: saved });
      setFields(fieldsFrom(saved.article));
      setCorrection('');
      setResult({ kind: 'success', text: successMessage(action, saved.article, correcting) });
    } catch (error) {
      const conflict = error instanceof DeskError && error.kind === 'conflict';
      setResult({ kind: 'error', text: (error as Error).message, conflict });
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null;
  return (
    <>
      <p>
        <Link href="/redaccion" className={styles.linkButton}>
          Volver a la lista
        </Link>
      </p>
      <p className={`${styles.meta} ${styles.spaced}`}>
        <span>
          <strong>{STATUS_LABEL[status]}</strong>
        </span>
        {draft.article.isDemo && <span className={styles.badge}>Demo</span>}
        {draft.writer && <span>Redactó {draft.writer}</span>}
        <span>Fecha de la nota: {formatFull(draft.article.publishedAt)}</span>
        {published && (
          <Link href={articlePath(draft.article.slug)} target="_blank">
            Ver en el sitio
          </Link>
        )}
      </p>

      <div className={styles.editor}>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            void perform('guardar');
          }}
        >
          <div className={styles.field}>
            <label htmlFor={`${fieldId}-title`} className={styles.label}>
              Título
            </label>
            <textarea
              id={`${fieldId}-title`}
              className={styles.input}
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
            <input id={`${fieldId}-tags`} className={styles.input} value={fields.tags} onChange={(e) => set('tags', e.target.value)} disabled={disabled} />
            <span className={styles.hint}>Separados por comas. Hasta 8.</span>
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
            />
            <span className={styles.hint}>{fields.seoDescription.length} de 155 caracteres.</span>
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
              />
              <span className={styles.hint}>
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
          {result?.kind === 'error' && (
            <div className={styles.error} role="alert">
              <p>{result.text}</p>
              {result.conflict && (
                <button type="button" className={styles.button} onClick={() => setAttempt((n) => n + 1)}>
                  Recargar la nota
                </button>
              )}
            </div>
          )}
          {result?.kind === 'success' && (
            <p className={styles.success} role="status">
              {result.text}
            </p>
          )}

          <div className={styles.actions}>
            {!published && status !== 'rejected' && (
              <>
                <button type="button" className={styles.publish} disabled={disabled} onClick={() => void perform('publicar')}>
                  {busy === 'publicar' ? 'Publicando…' : 'Publicar'}
                </button>
                <button type="submit" className={styles.primary} disabled={disabled || !dirty}>
                  {busy === 'guardar' ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button type="button" className={styles.danger} disabled={disabled} onClick={() => void perform('descartar')}>
                  {busy === 'descartar' ? 'Descartando…' : 'Descartar'}
                </button>
              </>
            )}
            {status === 'rejected' && (
              <>
                <button type="button" className={styles.primary} disabled={disabled} onClick={() => void perform('revision')}>
                  {busy === 'revision' ? 'Guardando…' : 'Volver a revisión'}
                </button>
                <button type="submit" className={styles.button} disabled={disabled || !dirty}>
                  Guardar cambios
                </button>
              </>
            )}
            {published && (
              <>
                <button type="submit" className={styles.primary} disabled={disabled || !dirty}>
                  {busy === 'guardar' ? 'Publicando la corrección…' : 'Publicar la corrección'}
                </button>
                {confirmUnpublish ? (
                  <>
                    <button type="button" className={styles.danger} disabled={disabled} onClick={() => void perform('despublicar')}>
                      {busy === 'despublicar' ? 'Despublicando…' : 'Sí, despublicar'}
                    </button>
                    <button type="button" className={styles.button} onClick={() => setConfirmUnpublish(false)}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.danger} disabled={disabled} onClick={() => setConfirmUnpublish(true)}>
                    Despublicar
                  </button>
                )}
              </>
            )}
            {dirty && <span className={styles.hint}>Hay cambios sin guardar.</span>}
          </div>
        </form>

        <DraftPanels article={draft.article} />
      </div>
    </>
  );
}
