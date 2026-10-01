'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { categories, getCategory } from '@/config/categories';
import { parseSearchQuery, search, type IndexedArticle, type SearchQuery } from '@/domain/search';
import { contentTypeLabel } from '@/domain/labels';
import { tagHref } from '@/lib/seo';
import { loadSearchIndex } from '@/lib/search-index';
import { ArticleList } from '@/components/listing/ArticleList';
import { Pagination } from '@/components/listing/Pagination';
import { RowsSkeleton } from '@/components/skeleton/Skeleton';
import styles from './page.module.css';

const PAGE_SIZE = 10;

interface TagOption {
  slug: string;
  name: string;
  count: number;
}

type IndexState = { kind: 'loading' } | { kind: 'ready'; index: IndexedArticle[] } | { kind: 'error' };

function toParams(query: SearchQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('seccion', query.category);
  if (query.type) params.set('formato', query.type);
  if (query.tag) params.set('tema', query.tag);
  if (query.from) params.set('desde', query.from);
  if (query.to) params.set('hasta', query.to);
  if (page > 1) params.set('pagina', String(page));
  return params.toString();
}

/**
 * Búsqueda avanzada. La página es estática: los criterios viven en la dirección
 * (/buscar?q=…&seccion=…) y la búsqueda corre en el navegador sobre el índice
 * publicado, con el mismo motor que el buscador de la cabecera.
 */
export function AdvancedSearch({ tags }: { tags: TagOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = parseSearchQuery(Object.fromEntries(searchParams.entries()));
  const tag = query.tag ? tags.find((t) => t.slug === query.tag) : undefined;
  const invalidRange = Boolean(query.from && query.to && query.from > query.to);
  const hasCriteria = Boolean(query.q || query.category || query.tag || query.type || query.from || query.to);

  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<IndexState>({ kind: 'loading' });

  // El índice se descarga solo cuando hay algo que buscar.
  useEffect(() => {
    if (!hasCriteria) return;
    let cancelled = false;
    loadSearchIndex().then(
      (index) => !cancelled && setState({ kind: 'ready', index }),
      () => !cancelled && setState({ kind: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [hasCriteria, attempt]);

  const result = hasCriteria && !invalidRange && state.kind === 'ready' ? search(state.index, { ...query, pageSize: PAGE_SIZE }) : null;
  const now = new Date();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const raw = Object.fromEntries([...data.entries()].map(([k, v]) => [k, String(v)]));
    const params = toParams(parseSearchQuery(raw), 1);
    router.push(params ? `/buscar?${params}` : '/buscar');
  };

  const summaryParts = [
    query.q && `“${query.q}”`,
    query.category && `en ${getCategory(query.category)?.name}`,
    query.type && `formato ${contentTypeLabel[query.type]?.toLowerCase() ?? 'noticia'}`,
    tag && `tema ${tag.name}`,
    query.from && `desde el ${query.from.split('-').reverse().join('/')}`,
    query.to && `hasta el ${query.to.split('-').reverse().join('/')}`,
  ].filter(Boolean);

  return (
    <>
      {/* `key`: al cambiar la dirección (atrás, adelante), el formulario muestra los criterios nuevos. */}
      <form key={searchParams.toString()} role="search" action="/buscar" method="get" className={styles.form} aria-label="Buscar notas" onSubmit={onSubmit}>
        <div className={styles.queryRow}>
          <label htmlFor="q" className={styles.label}>
            Palabras
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query.q ?? ''}
            className={styles.query}
            placeholder="Por ejemplo: calor, cuotas, rana"
            autoComplete="off"
            maxLength={200}
          />
        </div>
        <div className={styles.filters}>
          <div className={styles.field}>
            <label htmlFor="seccion" className={styles.label}>
              Sección
            </label>
            <select id="seccion" name="seccion" defaultValue={query.category ?? ''} className={styles.select}>
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="formato" className={styles.label}>
              Formato
            </label>
            <select id="formato" name="formato" defaultValue={query.type ?? ''} className={styles.select}>
              <option value="">Todos</option>
              <option value="noticia">Noticia</option>
              <option value="analisis">Análisis</option>
              <option value="explicador">Qué se sabe</option>
              <option value="breve">Breve</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="tema" className={styles.label}>
              Tema
            </label>
            <select id="tema" name="tema" defaultValue={query.tag ?? ''} className={styles.select}>
              <option value="">Todos</option>
              {tags.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="desde" className={styles.label}>
              Desde
            </label>
            <input
              id="desde"
              name="desde"
              type="date"
              defaultValue={query.from ?? ''}
              className={styles.select}
              aria-invalid={invalidRange || undefined}
              aria-describedby={invalidRange ? 'rango-error' : undefined}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="hasta" className={styles.label}>
              Hasta
            </label>
            <input
              id="hasta"
              name="hasta"
              type="date"
              defaultValue={query.to ?? ''}
              className={styles.select}
              aria-invalid={invalidRange || undefined}
              aria-describedby={invalidRange ? 'rango-error' : undefined}
            />
          </div>
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.submit}>
            Buscar
          </button>
          {hasCriteria && (
            <Link href="/buscar" className={styles.clear}>
              Limpiar filtros
            </Link>
          )}
        </div>
        {invalidRange && (
          <p id="rango-error" className={styles.error} role="alert">
            La fecha “desde” es posterior a la fecha “hasta”. Cambiá alguna de las dos.
          </p>
        )}
      </form>

      <section aria-labelledby="resultados" className={styles.results}>
        {!hasCriteria && (
          <>
            <h2 id="resultados" className={styles.resultsTitle}>
              Temas con más notas
            </h2>
            <ul role="list" className={styles.tags}>
              {tags.slice(0, 16).map((t) => (
                <li key={t.slug}>
                  <Link href={tagHref(t.slug, t.count)} className={styles.tag}>
                    {t.name}
                    <span className={styles.tagCount}>{t.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {hasCriteria && !invalidRange && state.kind === 'loading' && (
          <>
            <h2 id="resultados" className="visually-hidden">
              Resultados
            </h2>
            <RowsSkeleton label="Buscando…" />
          </>
        )}

        {hasCriteria && !invalidRange && state.kind === 'error' && (
          <>
            <h2 id="resultados" className={styles.resultsTitle}>
              No se pudo buscar
            </h2>
            <div className={styles.empty} role="alert">
              <p>No pudimos cargar el buscador. Revisá tu conexión y probá de nuevo.</p>
              <button
                type="button"
                className={styles.submit}
                onClick={() => {
                  setState({ kind: 'loading' });
                  setAttempt((n) => n + 1);
                }}
              >
                Reintentar
              </button>
            </div>
          </>
        )}

        {result && (
          <>
            <h2 id="resultados" className={styles.resultsTitle} aria-live="polite">
              {result.total === 0 ? 'Sin resultados' : `${result.total} ${result.total === 1 ? 'resultado' : 'resultados'}`}
              {summaryParts.length > 0 && <span className={styles.resultsFor}> para {summaryParts.join(', ')}</span>}
            </h2>
            {result.total === 0 ? (
              <div className={styles.empty}>
                <p>No encontramos notas con esos criterios. Algunas ideas:</p>
                <ul>
                  <li>Revisá la ortografía o probá con una palabra más general.</li>
                  <li>Quitá algún filtro, por ejemplo la sección o el rango de fechas.</li>
                  <li>
                    Recorré las <Link href="/ultimas">últimas noticias</Link>.
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <ArticleList
                  items={result.hits.map((h) => ({ article: h.article, title: h.title, snippet: h.snippet }))}
                  now={now}
                  headingLevel={3}
                />
                <Pagination
                  page={result.page}
                  pageSize={PAGE_SIZE}
                  total={result.total}
                  href={(page) => `/buscar?${toParams(query, page)}`}
                />
              </>
            )}
          </>
        )}

        {invalidRange && (
          <h2 id="resultados" className="visually-hidden">
            Resultados
          </h2>
        )}
      </section>
    </>
  );
}
