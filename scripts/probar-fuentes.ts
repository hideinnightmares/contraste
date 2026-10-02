/**
 * Prueba las fuentes reales de src/config/sources.ts, como las usa el pipeline:
 *
 * - descarga el feed y cuenta las notas (y avisa si no traen fecha: sin fecha, el pipeline no
 *   las usa);
 * - lee la nota más nueva como lo hace el pipeline (respeta robots.txt, muros de pago y noai);
 * - avisa si el sitio le prohíbe a Google usar sus notas para Gemini (Google-Extended): con Gemini
 *   en el plan gratis, de ese sitio el redactor recibe solo el resumen del feed;
 * - si el feed no anda, busca los que declara la portada del sitio y prueba direcciones
 *   habituales, para sugerir la correcta (solo del mismo sitio).
 *
 *   npm run fuentes:probar                    → todas las fuentes reales
 *   npm run fuentes:probar -- clarin bcra     → solo esas
 *   npm run fuentes:probar -- --descubrir     → además, lista los otros feeds que declara cada sitio
 *
 * Las fuentes deshabilitadas se prueban sin buscar alternativas, salvo que se las nombre.
 *
 * Termina con error si falla el feed de alguna fuente habilitada. Necesita salida a internet:
 * también corre en GitHub (Actions > Probar las fuentes).
 */
import { appendFile } from 'node:fs/promises';
import { loadEnvConfig } from '@next/env';
import { realSources } from '../src/config/sources';
import { parseFeed } from '../src/pipeline/sources/rss';
import { userAgent } from '../src/pipeline/sources/http';
import { WebArticleFetcher, type Permission, type SkipReason } from '../src/pipeline/sources/article';
import { COMMON_FEED_PATHS, feedLinks, sameSite } from '../src/pipeline/sources/discover';
import { GEMINI_OPT_OUT_AGENT } from '../src/pipeline/writers/gemini';
import type { SourceDefinition } from '../src/pipeline/types';

loadEnvConfig(process.cwd());

const TIMEOUT_MS = 20_000;
const FEED_ACCEPT = 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5';
/** Pedidos de búsqueda por fuente, como mucho, y pausa entre uno y otro al mismo sitio. */
const MAX_CANDIDATES = 25;
const PAUSE_MS = 1_000;

interface FeedOk {
  ok: true;
  items: number;
  /** Fecha de la nota más nueva, o `null` si ninguna trae fecha. */
  newest: string | null;
  sample: { url: string; title: string };
}
type FeedCheck = FeedOk | { ok: false; error: string; html?: string; finalUrl?: string };

interface Result {
  source: SourceDefinition;
  feed: FeedCheck;
  /** Feeds de secciones (`extraFeeds`). */
  extras: { url: string; feed: FeedCheck }[];
  /** Feeds que funcionan en el sitio: alternativas si el configurado falla, u otros con --descubrir. */
  suggestions: { url: string; feed: FeedOk }[];
  reading: { chars: number } | { skipped: SkipReason } | null;
  gemini: Permission | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const message = (err: unknown) => {
  const e = err as Error & { cause?: { code?: string; message?: string } };
  return e.cause?.code ?? e.cause?.message ?? e.message ?? String(err);
};

async function checkFeed(url: string): Promise<FeedCheck> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { 'User-Agent': userAgent(), Accept: FEED_ACCEPT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    return { ok: false, error: `no se pudo descargar (${message(err)})` };
  }
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  const body = await res.text();
  let entries;
  try {
    entries = parseFeed(body).filter((e) => e.url && e.title);
  } catch {
    const html = /html/i.test(res.headers.get('content-type') ?? '') ? body : undefined;
    return { ok: false, error: `no es un feed (${res.headers.get('content-type') ?? 'sin tipo'})`, html, finalUrl: res.url || url };
  }
  if (entries.length === 0) return { ok: false, error: 'el feed no tiene notas' };
  const dated = entries.filter((e) => e.publishedAt !== new Date(0).toISOString()).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const sample = dated[0] ?? entries[0];
  return { ok: true, items: entries.length, newest: dated[0]?.publishedAt ?? null, sample: { url: sample.url, title: sample.title } };
}

/**
 * Feeds que funcionan en el sitio de la fuente: los que declara o enlaza la portada y, si se
 * buscan alternativas, direcciones habituales. Solo del mismo sitio.
 */
async function suggest(source: SourceDefinition, { commonPaths }: { commonPaths: boolean }): Promise<{ url: string; feed: FeedOk }[]> {
  const site = source.site ?? `${new URL(source.url).origin}/`;
  const queue: string[] = [];
  const seen = new Set<string>([source.url]);
  const add = (urls: string[]) =>
    urls.filter((u) => !seen.has(u) && sameSite(u, site)).forEach((u) => (seen.add(u), queue.push(u)));

  try {
    const res = await fetch(site, { headers: { 'User-Agent': userAgent(), Accept: 'text/html' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.ok) {
      const links = feedLinks(await res.text(), res.url || site);
      add(links.declared);
      add(links.linked.slice(0, 10));
    }
  } catch {
    // Sin portada, quedan las direcciones habituales.
  }
  if (commonPaths) add(COMMON_FEED_PATHS.map((p) => new URL(p, site).toString()));

  const found: { url: string; feed: FeedOk }[] = [];
  for (let tries = 0; queue.length > 0 && tries < MAX_CANDIDATES; tries++) {
    const url = queue.shift()!;
    await sleep(PAUSE_MS);
    const feed = await checkFeed(url);
    if (feed.ok) found.push({ url, feed });
    // Una página que lista los feeds del sitio ("/rss"): se prueban los que enlaza.
    else if (feed.html && feed.finalUrl) {
      const links = feedLinks(feed.html, feed.finalUrl);
      add([...links.declared, ...links.linked.slice(0, 15)]);
    }
  }
  return found.sort((a, b) => (b.feed.newest ?? '').localeCompare(a.feed.newest ?? ''));
}

async function probe(source: SourceDefinition, { discover, named }: { discover: boolean; named: boolean }): Promise<Result> {
  const [feed, ...extraChecks] = await Promise.all([source.url, ...(source.extraFeeds ?? [])].map(checkFeed));
  const extras = (source.extraFeeds ?? []).map((url, i) => ({ url, feed: extraChecks[i] }));
  const result: Result = { source, feed, extras, suggestions: [], reading: null, gemini: null };
  if (!feed.ok) {
    if (source.enabled || named) result.suggestions = await suggest(source, { commonPaths: true });
    return result;
  }
  if (discover) result.suggestions = await suggest(source, { commonPaths: false });
  const reader = new WebArticleFetcher();
  const text = await reader.fetchText(feed.sample.url);
  result.reading = text ? { chars: text.length } : { skipped: reader.skipped[0]?.reason ?? 'error' };
  const forGemini = new WebArticleFetcher({ alsoRespect: [GEMINI_OPT_OUT_AGENT] });
  result.gemini = await forGemini.permission(new URL(feed.sample.url)).catch(() => 'robots' as const);
  return result;
}

function age(iso: string | null): string {
  if (!iso) return 'sin fecha';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `hace ${Math.max(minutes, 0)} min`;
  if (minutes < 48 * 60) return `hace ${Math.round(minutes / 60)} h`;
  return `hace ${Math.round(minutes / 1440)} días`;
}

const READING_LABEL: Record<SkipReason, string> = {
  robots: 'su robots.txt no nos deja leerla',
  ai_optout: 'su robots.txt no deja que la use la IA del redactor',
  paywall: 'muro de pago: se usa solo el resumen del feed',
  noai: 'la página pide no ser usada por IA (noai)',
  http: 'el sitio respondió con un error',
  not_html: 'no es una página web',
  too_large: 'la página es demasiado grande',
  no_text: 'no se encontró el texto de la nota',
  error: 'no se pudo descargar',
};

const GEMINI_LABEL: Record<Permission, string> = {
  ok: 'recibe el texto completo',
  robots: 'no aplica (no la leemos)',
  ai_optout: 'solo el resumen: el sitio se lo prohíbe a Google-Extended',
};

const formatNumber = (n: number) => n.toLocaleString('es-AR');

function report(r: Result): string[] {
  const lines = [`\n▸ ${r.source.name} (${r.source.id})${r.source.enabled ? '' : ' · deshabilitada'}`, `  Feed: ${r.source.url}`];
  if (!r.feed.ok) {
    lines.push(`  ${r.source.enabled ? '✗' : '·'} El feed no anda: ${r.feed.error}.`);
    if (!r.source.enabled) return lines;
    if (r.suggestions.length === 0) lines.push('    No se encontró otro feed en el sitio.');
    else {
      lines.push('    Feeds que funcionan en el sitio:');
      for (const s of r.suggestions.slice(0, 8)) lines.push(`      ${s.url} (${s.feed.items} notas, la más nueva ${age(s.feed.newest)})`);
    }
    return lines;
  }
  lines.push(`  ✓ ${r.feed.items} notas; la más nueva, ${age(r.feed.newest)}.`);
  for (const extra of r.extras) {
    lines.push(
      extra.feed.ok
        ? `  ✓ Sección ${extra.url}: ${extra.feed.items} notas, la más nueva ${age(extra.feed.newest)}.`
        : `  ✗ Sección ${extra.url}: no anda (${extra.feed.error}).`,
    );
  }
  if (!r.feed.newest) lines.push('  ✗ Las notas no traen fecha: el pipeline no puede saber si son de hoy y no las usa.');
  if (r.reading && 'chars' in r.reading) lines.push(`  ✓ Nota de ejemplo leída: ${formatNumber(r.reading.chars)} caracteres («${r.feed.sample.title}»).`);
  else if (r.reading) lines.push(`  ✗ Nota de ejemplo no leída: ${READING_LABEL[r.reading.skipped]} (${r.feed.sample.url}).`);
  if (r.gemini) lines.push(`  ${r.gemini === 'ok' ? '✓' : '·'} Gemini (plan gratis): ${GEMINI_LABEL[r.gemini]}.`);
  if (r.suggestions.length > 0) {
    lines.push('    Otros feeds del sitio:');
    for (const s of r.suggestions.slice(0, 12)) lines.push(`      ${s.url} (${s.feed.items} notas, la más nueva ${age(s.feed.newest)})`);
  }
  return lines;
}

function summaryTable(results: Result[]): string {
  const rows = results.map((r) => {
    const name = r.source.enabled ? r.source.name : `${r.source.name} (deshabilitada)`;
    if (!r.feed.ok) {
      const hint = r.suggestions[0] ? `probar ${r.suggestions[0].url}` : r.source.enabled ? 'sin alternativas' : '';
      return `| ${name} | ✗ ${r.feed.error} | | | ${hint} | |`;
    }
    const reading = r.reading && 'chars' in r.reading ? `✓ ${formatNumber(r.reading.chars)} car.` : r.reading ? `✗ ${READING_LABEL[r.reading.skipped]}` : '';
    const sections = r.extras.length > 0 ? ` (+${r.extras.reduce((n, e) => n + (e.feed.ok ? e.feed.items : 0), 0)} de secciones)` : '';
    const brokenSections = r.extras.filter((e) => !e.feed.ok).length;
    const feed = brokenSections > 0 ? `✓ (✗ ${brokenSections} sección/es)` : '✓';
    return `| ${name} | ${feed} | ${r.feed.items}${sections} | ${age(r.feed.newest)} | ${reading} | ${r.gemini ? GEMINI_LABEL[r.gemini] : ''} |`;
  });
  return ['| Fuente | Feed | Notas | La más nueva | Lectura de una nota | Gemini gratis |', '| --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const discover = args.includes('--descubrir');
  const wanted = args.filter((a) => !a.startsWith('-'));
  const unknown = wanted.filter((id) => !realSources.some((s) => s.id === id));
  if (unknown.length > 0) throw new Error(`No hay fuentes con id ${unknown.join(', ')}. Ids: ${realSources.map((s) => s.id).join(', ')}.`);
  const sources = wanted.length > 0 ? realSources.filter((s) => wanted.includes(s.id)) : realSources;

  console.log(`Probando ${sources.length} fuentes como ${userAgent()}…`);
  // Cada fuente es un sitio distinto: se prueban todas a la vez.
  const results = await Promise.all(sources.map((source) => probe(source, { discover, named: wanted.includes(source.id) })));
  for (const r of results) console.log(report(r).join('\n'));

  const failed = results.filter((r) => r.source.enabled && (!r.feed.ok || r.extras.some((e) => !e.feed.ok)));
  const table = summaryTable(results);
  console.log(`\n${table}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Prueba de las fuentes\n\n${table}\n`);
  }
  if (failed.length > 0) {
    console.error(`\nNo anda algún feed de ${failed.length} fuente(s) habilitada(s): ${failed.map((r) => r.source.id).join(', ')}.`);
    process.exitCode = 1;
  } else {
    console.log('\nTodas las fuentes habilitadas responden.');
  }
}

main().catch((err) => {
  console.error('La prueba de las fuentes falló:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
