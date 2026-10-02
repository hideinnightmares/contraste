import type { ArticleFetcher } from '../stages/research';
import { stripHtml } from './connector';
import { BOT_TOKEN, userAgent } from './http';
import { isAllowed, parseRobots, type RobotsRules } from './robots';

/**
 * Lectura del texto completo de una nota, para que el redactor trabaje con los hechos y no
 * solo con el resumen del feed. Reglas:
 *
 * - Respeta el robots.txt de cada sitio (robot `ContrasteBot`). Si no se puede leer el
 *   robots.txt por un error del sitio, no se lee nada (RFC 9309).
 * - No lee notas detrás de un muro de pago: si la página se declara de acceso pago
 *   (`isAccessibleForFree: false` en sus datos estructurados), usa solo el resumen del feed.
 * - Respeta la marca `noai` en `<meta name="robots">`.
 * - Un pedido cada `minIntervalMs` por sitio, con límite de tiempo y de tamaño.
 * - El texto se usa solo para redactar: no se guarda en la base ni en los informes.
 */

const TIMEOUT_MS = 15_000;
const MAX_BYTES = 3_000_000;
/** Menos que esto no es una nota: es un error de extracción o una página de otra cosa. */
const MIN_CHARS = 200;

export interface ExtractedArticle {
  text: string | null;
  /** La página se declara de acceso pago. */
  paywalled: boolean;
  /** La página pide no ser usada por sistemas de inteligencia artificial. */
  noAi: boolean;
}

type Json = Record<string, unknown>;

function isArticleType(type: unknown): boolean {
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === 'string' && (/Article$/.test(t) || t === 'BlogPosting'));
}

const notFree = (value: unknown) => value === false || (typeof value === 'string' && value.trim().toLowerCase() === 'false');

/** Nodos de tipo nota en los bloques JSON-LD de la página (también dentro de @graph). */
function articleNodes(html: string): Json[] {
  const nodes: Json[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const obj = node as Json;
    if (isArticleType(obj['@type'])) nodes.push(obj);
    if (obj['@graph']) walk(obj['@graph']);
  };
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      walk(JSON.parse(m[1].trim()));
    } catch {
      // Un bloque mal formado no impide leer el resto.
    }
  }
  return nodes;
}

function metaRobotsNoAi(html: string): boolean {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const name = /\bname\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1].toLowerCase();
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1].toLowerCase() ?? '';
    if ((name === 'robots' || name === BOT_TOKEN.toLowerCase()) && /\bnoai\b/.test(content)) return true;
  }
  return false;
}

/** Párrafos de un fragmento HTML, sin los bloques que no son texto de la nota. */
function paragraphs(fragment: string, minLength: number): string[] {
  const cleaned = fragment.replace(/<(script|style|noscript|svg|nav|aside|footer|form|figure|button)\b[\s\S]*?<\/\1>/gi, ' ');
  const found: string[] = [];
  for (const m of cleaned.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripHtml(m[1]);
    if (text.length >= minLength && found[found.length - 1] !== text) found.push(text);
  }
  return found;
}

export function extractArticle(html: string): ExtractedArticle {
  const nodes = articleNodes(html);
  const paywalled = nodes.some(
    (n) => notFree(n.isAccessibleForFree) || (Array.isArray(n.hasPart) && n.hasPart.some((p) => notFree((p as Json)?.isAccessibleForFree))),
  );
  const noAi = metaRobotsNoAi(html);
  if (paywalled || noAi) return { text: null, paywalled, noAi };

  // 1. El cuerpo que la página declara en sus datos estructurados.
  const declared = nodes
    .map((n) => (typeof n.articleBody === 'string' ? stripHtml(n.articleBody) : ''))
    .sort((a, b) => b.length - a.length)[0];
  if (declared && declared.length >= MIN_CHARS) return { text: declared, paywalled, noAi };

  // 2. Los párrafos del <article> con más texto; si no hay, los de <main>; si no, los del documento.
  const containers = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)].map((m) => paragraphs(m[1], 40));
  let best = containers.sort((a, b) => b.join('').length - a.join('').length)[0] ?? [];
  if (best.join('').length < MIN_CHARS) {
    const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
    best = main ? paragraphs(main[1], 40) : paragraphs(html, 60);
  }
  const text = best.join('\n');
  return { text: text.length >= MIN_CHARS ? text : null, paywalled, noAi };
}

/** Corta en el último fin de párrafo u oración antes del límite. */
export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const cut = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf('. '));
  return (cut > maxChars * 0.5 ? slice.slice(0, cut + 1) : slice).trim();
}

export type SkipReason = 'robots' | 'paywall' | 'noai' | 'http' | 'not_html' | 'too_large' | 'no_text' | 'error';

const SKIP_LABEL: Record<SkipReason, string> = {
  robots: 'su robots.txt no lo permite',
  paywall: 'está detrás de un muro de pago',
  noai: 'la página pide no ser usada por IA (noai)',
  http: 'el sitio respondió con un error',
  not_html: 'no es una página web',
  too_large: 'la página supera el tamaño máximo',
  no_text: 'no se encontró el texto de la nota',
  error: 'no se pudo descargar',
};

interface FetcherOptions {
  fetchImpl?: typeof fetch;
  /** Pausa mínima entre dos pedidos al mismo sitio. */
  minIntervalMs?: number;
  /** Caracteres de texto por fuente que recibe el redactor. */
  maxChars?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}

type RobotsVerdict = RobotsRules | 'allow_all' | 'deny_all';

export class WebArticleFetcher implements ArticleFetcher {
  private readonly fetchImpl: typeof fetch;
  private readonly minIntervalMs: number;
  private readonly maxChars: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly log: (message: string) => void;
  private readonly robots = new Map<string, Promise<RobotsVerdict>>();
  private readonly nextSlot = new Map<string, number>();
  /** Notas que no se leyeron y por qué. */
  readonly skipped: { url: string; reason: SkipReason }[] = [];

  constructor(options: FetcherOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.minIntervalMs = options.minIntervalMs ?? 2_000;
    this.maxChars = options.maxChars ?? 8_000;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.log = options.log ?? (() => {});
  }

  /** Reserva el turno de forma sincrónica, así los pedidos simultáneos al mismo sitio se ordenan. */
  private async turn(host: string) {
    const now = this.now();
    const slot = Math.max(now, this.nextSlot.get(host) ?? 0);
    this.nextSlot.set(host, slot + this.minIntervalMs);
    if (slot > now) await this.sleep(slot - now);
  }

  private async get(url: URL, accept: string): Promise<Response> {
    await this.turn(url.host);
    return this.fetchImpl(url, {
      headers: { 'User-Agent': userAgent(), Accept: accept },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
    });
  }

  private robotsFor(url: URL): Promise<RobotsVerdict> {
    let verdict = this.robots.get(url.origin);
    if (!verdict) {
      verdict = (async (): Promise<RobotsVerdict> => {
        try {
          const res = await this.get(new URL('/robots.txt', url.origin), 'text/plain');
          // RFC 9309: sin robots.txt (4xx) no hay restricciones; un error del sitio (5xx) se
          // trata como prohibición total hasta poder leerlo.
          if (res.status >= 500) return 'deny_all';
          if (!res.ok) return 'allow_all';
          return parseRobots(await res.text());
        } catch {
          return 'deny_all';
        }
      })();
      this.robots.set(url.origin, verdict);
    }
    return verdict;
  }

  private async allowed(url: URL): Promise<boolean> {
    const verdict = await this.robotsFor(url);
    if (verdict === 'allow_all') return true;
    if (verdict === 'deny_all') return false;
    return isAllowed(verdict, BOT_TOKEN, `${url.pathname}${url.search}`);
  }

  private skip(url: string, reason: SkipReason): null {
    this.skipped.push({ url, reason });
    this.log(`texto completo no leído (${SKIP_LABEL[reason]}): ${url}`);
    return null;
  }

  async fetchText(rawUrl: string): Promise<string | null> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return this.skip(rawUrl, 'error');
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return this.skip(rawUrl, 'error');
    if (!(await this.allowed(url))) return this.skip(rawUrl, 'robots');

    let html: string;
    try {
      const res = await this.get(url, 'text/html,application/xhtml+xml;q=0.9');
      if (!res.ok) return this.skip(rawUrl, 'http');
      // Si una redirección llevó a otra dirección, esa también tiene que estar permitida.
      if (res.url && res.url !== url.toString()) {
        const final = new URL(res.url);
        if (!(await this.allowed(final))) return this.skip(rawUrl, 'robots');
      }
      const type = res.headers.get('content-type') ?? '';
      if (!/html/i.test(type)) return this.skip(rawUrl, 'not_html');
      if (Number(res.headers.get('content-length') ?? '0') > MAX_BYTES) return this.skip(rawUrl, 'too_large');
      html = await res.text();
      if (html.length > MAX_BYTES) return this.skip(rawUrl, 'too_large');
    } catch {
      return this.skip(rawUrl, 'error');
    }

    const article = extractArticle(html);
    if (article.paywalled) return this.skip(rawUrl, 'paywall');
    if (article.noAi) return this.skip(rawUrl, 'noai');
    if (!article.text) return this.skip(rawUrl, 'no_text');
    return truncateText(article.text, this.maxChars);
  }
}
