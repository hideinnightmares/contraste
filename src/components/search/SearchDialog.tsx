'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { OPEN_SEARCH_EVENT } from './events';
import { Highlighted } from './Highlighted';
import { getCategory } from '@/config/categories';
import { formatPublished } from '@/domain/dates';
import { search, type Highlight } from '@/domain/search';
import { loadSearchIndex } from '@/lib/search-index';
import styles from './SearchDialog.module.css';

type Status = 'idle' | 'loading' | 'done' | 'error';

interface QuickHit {
  slug: string;
  title: Highlight;
  categoryName: string;
  published: string;
}

interface QuickResults {
  hits: QuickHit[];
  total: number;
}

const QUICK_LIMIT = 6;

interface Props {
  sections: { slug: string; name: string }[];
}

/**
 * Búsqueda instantánea en un `<dialog>` modal: el navegador maneja el foco, la
 * tecla Escape y la inercia del resto de la página. Se abre con los botones de
 * búsqueda o con la tecla "/".
 */
export function SearchDialog({ sections }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [data, setData] = useState<QuickResults | null>(null);
  const titleId = useId();
  const statusId = useId();

  const open = useCallback(() => {
    const d = dialog.current;
    if (!d || d.open) return;
    opener.current = document.activeElement as HTMLElement | null;
    d.showModal();
    requestAnimationFrame(() => input.current?.focus());
  }, []);

  const close = useCallback(() => dialog.current?.close(), []);

  useEffect(() => {
    const onOpen = () => open();
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Devuelve el foco a quien abrió el buscador.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onClose = () => opener.current?.focus?.();
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, []);

  // Búsqueda en el navegador sobre el índice publicado, con espera corta para no buscar en cada tecla.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      try {
        const index = await loadSearchIndex();
        if (cancelled) return;
        const result = search(index, { q, category: section || undefined, page: 1, pageSize: QUICK_LIMIT });
        const now = new Date();
        setData({
          total: result.total,
          hits: result.hits.map((h) => ({
            slug: h.article.slug,
            title: h.title,
            categoryName: getCategory(h.article.category)?.name ?? h.article.category,
            published: formatPublished(h.article.publishedAt, now),
          })),
        });
        setStatus('done');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, section]);

  const submit = (e?: { preventDefault: () => void }) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    const params = new URLSearchParams({ q });
    if (section) params.set('seccion', section);
    close();
    router.push(`/buscar?${params}`);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      const first = dialog.current?.querySelector<HTMLAnchorElement>('[data-result]');
      if (first) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const onResultsKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const links = Array.from(dialog.current?.querySelectorAll<HTMLAnchorElement>('[data-result]') ?? []);
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (index === -1) return;
    e.preventDefault();
    if (e.key === 'ArrowDown') links[Math.min(index + 1, links.length - 1)]?.focus();
    else if (index === 0) input.current?.focus();
    else links[index - 1]?.focus();
  };

  // Con menos de dos letras no se busca: el estado visible es "inicial", sin tocar el estado guardado.
  const tooShort = query.trim().length < 2;
  const view: Status = tooShort ? 'idle' : status;
  const results = tooShort ? null : data;

  const announcement =
    view === 'loading'
      ? 'Buscando…'
      : view === 'error'
        ? 'No se pudo completar la búsqueda.'
        : view === 'done' && results
          ? results.total === 0
            ? 'Sin resultados.'
            : `${results.total} ${results.total === 1 ? 'resultado' : 'resultados'}.`
          : '';

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
    >
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            Buscar en Contraste
          </h2>
          <button type="button" className={styles.close} onClick={close} aria-label="Cerrar el buscador">
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <form role="search" className={styles.form} onSubmit={submit}>
          <label htmlFor={`${titleId}-q`} className="visually-hidden">
            Palabras a buscar
          </label>
          <Search className={styles.inputIcon} size={22} strokeWidth={1.75} aria-hidden="true" />
          <input
            ref={input}
            id={`${titleId}-q`}
            className={styles.input}
            type="search"
            name="q"
            autoComplete="off"
            spellCheck={false}
            placeholder="Tema, nombre, etiqueta…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            aria-describedby={statusId}
          />
          <button type="submit" className={styles.submit}>
            Buscar
          </button>
        </form>

        <fieldset className={styles.filters}>
          <legend className={styles.legend}>Sección</legend>
          <div className={styles.chips}>
            {[{ slug: '', name: 'Todas' }, ...sections].map((s) => (
              <label key={s.slug || 'todas'} className={styles.chip}>
                <input
                  type="radio"
                  name="seccion"
                  value={s.slug}
                  checked={section === s.slug}
                  onChange={() => setSection(s.slug)}
                />
                <span>{s.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <p id={statusId} className="visually-hidden" aria-live="polite">
          {announcement}
        </p>

        <div className={styles.results}>
          {view === 'idle' && (
            <p className={styles.hint}>
              Escribí al menos dos letras. Buscamos en títulos, textos, secciones y etiquetas. Para filtrar por fecha, usá la{' '}
              <Link href="/buscar" onClick={close} className={styles.inlineLink}>
                búsqueda avanzada
              </Link>
              .
            </p>
          )}
          {view === 'loading' && !results && (
            <ul role="list" className={styles.skeletons} aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className={styles.skeleton} />
              ))}
            </ul>
          )}
          {view === 'error' && (
            <p className={styles.error} role="alert">
              No pudimos buscar en este momento. Revisá tu conexión y probá de nuevo.
            </p>
          )}
          {results && view !== 'error' && (
            <>
              {results.total === 0 ? (
                <p className={styles.hint}>
                  No encontramos notas con “{query.trim()}”
                  {section ? ' en esta sección' : ''}. Probá con otra palabra o quitá el filtro de sección.
                </p>
              ) : (
                <ul role="list" className={styles.list} data-busy={view === 'loading'} onKeyDown={onResultsKeyDown}>
                  {results.hits.map((hit) => (
                    <li key={hit.slug}>
                      <Link href={`/nota/${hit.slug}`} className={styles.result} data-result onClick={close}>
                        <span className={styles.resultMeta}>
                          {hit.categoryName}
                          <span className={styles.resultDate}>{hit.published}</span>
                        </span>
                        <span className={styles.resultTitle}>
                          <Highlighted value={hit.title} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {results.total > results.hits.length && (
                <button type="button" className={styles.more} onClick={submit}>
                  Ver los {results.total} resultados
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
