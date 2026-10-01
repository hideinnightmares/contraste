import { getCategory } from '@/config/categories';
import type { Article, ArticleSummary, ContentType } from './types';
import { bodyText, normalize, slugify, tokenize } from './text';
import { toSummary, byNewest } from './summary';
import { calendarDay } from './dates';

/**
 * Buscador de notas.
 *
 * Busca en título, bajada, cuerpo, sección y etiquetas, y filtra por sección,
 * etiqueta, formato y rango de fechas. Todas las palabras de la consulta tienen que
 * aparecer en algún campo (búsqueda AND); la última admite prefijo para que la
 * búsqueda instantánea encuentre "inflac" → "inflación".
 *
 * Funciona en memoria. El sitio es estático: al armarlo se publica el índice
 * (`/indice-busqueda.json`, ver `SearchDocument`) y la búsqueda corre en el
 * navegador. Si el índice crece demasiado para descargarlo entero (miles de notas),
 * se reemplaza por un índice partido en trozos (por ejemplo, Pagefind) o por un
 * servicio de búsqueda, manteniendo esta misma firma.
 */

export interface SearchQuery {
  q?: string;
  category?: string;
  tag?: string;
  type?: ContentType;
  /** Fechas en formato AAAA-MM-DD, inclusivas, en hora de Buenos Aires. */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface Highlight {
  text: string;
  /** Rangos [inicio, fin) dentro de `text` que coinciden con la búsqueda. */
  ranges: [number, number][];
}

export interface SearchHit {
  article: ArticleSummary;
  score: number;
  title: Highlight;
  snippet: Highlight;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  page: number;
  pageSize: number;
  query: SearchQuery;
}

const WEIGHTS = { title: 6, tags: 4, dek: 3, category: 2, body: 1 } as const;
const MAX_PAGE_SIZE = 50;

/** Lo que el buscador necesita de cada nota: es lo que se publica en el índice. */
export interface SearchDocument {
  summary: ArticleSummary;
  /** Texto plano del cuerpo. */
  body: string;
}

export function toSearchDocument(article: Article): SearchDocument {
  return { summary: toSummary(article), body: bodyText(article.body) };
}

export interface IndexedArticle {
  summary: ArticleSummary;
  fields: Record<keyof typeof WEIGHTS, string[]>;
  body: string;
}

export function buildIndex(documents: SearchDocument[]): IndexedArticle[] {
  return documents.map(({ summary, body }) => ({
    summary,
    body,
    fields: {
      title: tokenize(summary.title),
      tags: summary.tags.flatMap(tokenize),
      dek: tokenize(summary.dek),
      category: tokenize(getCategory(summary.category)?.name ?? summary.category),
      body: tokenize(body),
    },
  }));
}

/** Convierte "AAAA-MM-DD" al formato de `calendarDay` ("DD/MM/AAAA") para comparar. */
function dayKey(isoDay: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

const sortableDay = (key: string) => key.split('/').reverse().join('');

export function parseSearchQuery(params: Record<string, string | string[] | undefined>): SearchQuery {
  const one = (k: string) => {
    const v = params[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() !== '' ? s.trim().slice(0, 200) : undefined;
  };
  const types: ContentType[] = ['noticia', 'analisis', 'explicador', 'breve'];
  const type = one('formato');
  const date = (k: string) => {
    const v = one(k);
    return v && dayKey(v) ? v : undefined;
  };
  const page = Number(one('pagina') ?? '1');
  return {
    q: one('q'),
    category: one('seccion') && getCategory(one('seccion')!) ? one('seccion') : undefined,
    tag: one('tema') ? slugify(one('tema')!) : undefined,
    type: types.includes(type as ContentType) ? (type as ContentType) : undefined,
    from: date('desde'),
    to: date('hasta'),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function search(index: IndexedArticle[], query: SearchQuery): SearchResult {
  const pageSize = Math.min(Math.max(query.pageSize ?? 10, 1), MAX_PAGE_SIZE);
  const page = Math.max(query.page ?? 1, 1);
  const terms = tokenize(query.q ?? '');
  const fromKey = query.from ? dayKey(query.from) : null;
  const toKey = query.to ? dayKey(query.to) : null;

  const hits: SearchHit[] = [];
  for (const entry of index) {
    const article = entry.summary;
    if (query.category && article.category !== query.category) continue;
    if (query.type && article.type !== query.type) continue;
    if (query.tag && !article.tags.some((t) => slugify(t) === query.tag)) continue;
    const day = sortableDay(calendarDay(article.publishedAt));
    if (fromKey && day < sortableDay(fromKey)) continue;
    if (toKey && day > sortableDay(toKey)) continue;

    let score = 0;
    let matchedAll = true;
    terms.forEach((term, i) => {
      const isLast = i === terms.length - 1;
      const matches = (token: string) => token === term || (isLast && term.length >= 3 && token.startsWith(term));
      let termScore = 0;
      for (const [field, weight] of Object.entries(WEIGHTS) as [keyof typeof WEIGHTS, number][]) {
        const count = entry.fields[field].filter(matches).length;
        if (count > 0) termScore += weight * (1 + Math.log(count));
      }
      if (termScore === 0) matchedAll = false;
      score += termScore;
    });
    if (terms.length > 0 && !matchedAll) continue;

    // Bonus por frase exacta en el título.
    if (terms.length > 1 && normalize(article.title).includes(normalize(query.q ?? '').trim())) score *= 1.5;

    hits.push({
      article: entry.summary,
      score,
      title: highlight(article.title, terms),
      snippet: snippet(article.dek, entry.body, terms),
    });
  }

  // Sin consulta de texto, el orden es cronológico; con consulta, por relevancia y luego fecha.
  hits.sort((a, b) => (terms.length ? b.score - a.score : 0) || byNewest(a.article, b.article));

  const start = (page - 1) * pageSize;
  return { hits: hits.slice(start, start + pageSize), total: hits.length, page, pageSize, query };
}

/** Marca coincidencias trabajando sobre el texto normalizado, que conserva las posiciones del original. */
export function highlight(text: string, terms: string[]): Highlight {
  if (terms.length === 0) return { text, ranges: [] };
  const norm = normalize(text);
  // `normalize` elimina diacríticos combinantes; si cambia la longitud no se puede mapear con seguridad.
  if (norm.length !== text.length) return { text, ranges: [] };
  const ranges: [number, number][] = [];
  const wordRe = /[a-z0-9]+/g;
  let m: RegExpExecArray | null;
  while ((m = wordRe.exec(norm))) {
    const word = m[0];
    const idx = m.index;
    terms.forEach((term, i) => {
      const isLast = i === terms.length - 1;
      if (word === term || (isLast && term.length >= 3 && word.startsWith(term)) || (term.length >= 4 && word.startsWith(term))) {
        ranges.push([idx, idx + (word === term ? word.length : Math.min(word.length, term.length))]);
      }
    });
  }
  ranges.sort((a, b) => a[0] - b[0]);
  return { text, ranges: mergeRanges(ranges) };
}

function mergeRanges(ranges: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const r of ranges) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push([...r]);
  }
  return out;
}

/** Fragmento del cuerpo alrededor de la primera coincidencia; si no hay, la bajada. */
function snippet(dek: string, body: string, terms: string[]): Highlight {
  if (terms.length === 0) return { text: dek, ranges: [] };
  const dekHl = highlight(dek, terms);
  if (dekHl.ranges.length > 0) return dekHl;
  const norm = normalize(body);
  let pos = -1;
  for (const t of terms) {
    const re = new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    const m = re.exec(norm);
    if (m) {
      pos = m.index + m[1].length;
      break;
    }
  }
  if (pos === -1) return { text: dek, ranges: [] };
  const start = Math.max(0, body.lastIndexOf(' ', Math.max(0, pos - 80)) + 1);
  const endCut = body.indexOf(' ', Math.min(body.length, pos + 160));
  const end = endCut === -1 ? body.length : endCut;
  const text = `${start > 0 ? '…' : ''}${body.slice(start, end).replace(/\n/g, ' ')}${end < body.length ? '…' : ''}`;
  return highlight(text, terms);
}
