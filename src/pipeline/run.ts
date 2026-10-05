import { editorial } from '@/config/editorial';
import { realSources, sourceDefinitions } from '@/config/sources';
import type { SourceConnector } from './sources/connector';
import { RssConnector } from './sources/rss';
import { FixtureConnector } from './sources/fixture';
import { clusterItems } from './stages/dedupe';
import { verifyCluster } from './stages/verify';
import { knownOutlets } from './stages/attribution';
import { classifyCluster } from './stages/classify';
import { buildBrief, readFullTexts, type ArticleFetcher } from './stages/research';
import { checkGrounding } from './stages/grounding';
import { decideReview } from './stages/review';
import { draftToArticle, type Publisher } from './stages/publish';
import type { ArticleWriter } from './writers/writer';
import { WriterError, resolveSourceIds } from './writers/writer';
import type { ClusterOutcome, PipelineReport, SourceDefinition, SourceItem, StoryCluster, VerificationReport } from './types';
import type { Log } from './registro';

/** Ventana de recopilación, en horas. */
export const DEFAULT_SINCE_HOURS = 24;

export interface PipelineOptions {
  /** Ventana de recopilación. */
  sinceHours?: number;
  connectors?: SourceConnector[];
  /**
   * Ítems de corridas anteriores (memory.ts). Cada feed muestra solo sus últimas notas: con la
   * memoria, un hecho que dos medios publican con horas de diferencia se puede contrastar.
   */
  previousItems?: SourceItem[];
  /** Sin redactor, el pipeline llega hasta la verificación y deja todo en espera. */
  writer?: ArticleWriter | null;
  /** Lee el texto completo de cada nota (sources/article.ts). Sin él, se usa solo el feed. */
  fetcher?: ArticleFetcher;
  publisher?: Publisher | null;
  now?: () => Date;
  /**
   * Máximo de hechos que pasan a investigación y redacción en esta corrida. Cuida el cupo
   * gratuito del redactor y la duración de la corrida. Van primero los que cubren más fuentes
   * independientes; el resto queda para la próxima. Sin límite si no se indica.
   */
  maxDrafts?: number;
  /** Máximo de borradores de una misma sección por corrida. Por defecto, el de `config/editorial.ts`. */
  maxPerCategory?: number;
  /** Slugs ya usados en el sitio, para no repetir. */
  takenSlugs?: Set<string>;
  /**
   * URL canónica de cada fuente ya citada por una nota existente → slug de esa nota. Un hecho
   * con alguna de esas URLs ya está cubierto: no se vuelve a redactar (ni a gastar cupo de IA).
   */
  coveredSourceUrls?: Map<string, string>;
  /** Registro de la corrida: los títulos y las direcciones van aparte, en `detail` (registro.ts). */
  log?: Log;
}

export function connectorsFor(definitions: SourceDefinition[] = realSources): SourceConnector[] {
  return definitions
    .filter((d) => d.enabled)
    .map((d) => (d.connector === 'rss' ? new RssConnector(d) : new FixtureConnector(d)));
}

/** Cobertura en vivo o página de servicio: no es un hecho para contrastar. */
export function isRollingCoverage(item: Pick<SourceItem, 'title'>): boolean {
  return editorial.collection.skipTitles.some((pattern) => pattern.test(item.title));
}

interface Candidate {
  cluster: StoryCluster;
  verification: VerificationReport;
  category: string | null;
}

/** Fuentes primarias: el hecho sale de ellas y no de lo que cuenta un medio. */
const PRIMARY_KINDS = new Set(['official', 'public_document', 'news_agency']);
const hasPrimarySource = (cluster: StoryCluster) => cluster.items.some((i) => !i.discoveryOnly && PRIMARY_KINDS.has(i.sourceKind));

/** A igual cobertura, primero lo confirmado; lo que todas las fuentes dan en condicional, al final. */
const STATUS_RANK: Partial<Record<VerificationReport['status'], number>> = { verified: 0, disputed: 1, partial: 2 };
const statusRank = (c: Candidate) => STATUS_RANK[c.verification.status] ?? 3;

/**
 * Orden de redacción: primero lo que cubren más fuentes independientes (lo que más medios
 * consideran noticia); a igual cobertura, lo confirmado, lo que tiene una fuente primaria y
 * después lo más reciente.
 */
function byPriority(a: Candidate, b: Candidate): number {
  return (
    b.verification.independentSources - a.verification.independentSources ||
    statusRank(a) - statusRank(b) ||
    Number(hasPrimarySource(b.cluster)) - Number(hasPrimarySource(a.cluster)) ||
    b.cluster.lastSeenAt.localeCompare(a.cluster.lastSeenAt)
  );
}

/**
 * Orquestador: FUENTES → RECOPILACIÓN → DEDUPLICACIÓN → INVESTIGACIÓN →
 * VERIFICACIÓN → REDACCIÓN → CONTROL DE CIFRAS → REVISIÓN → PUBLICACIÓN.
 *
 * Cada etapa es una función pura o una interfaz reemplazable. Un fallo en una
 * fuente o en un grupo no detiene al resto: queda registrado en el informe.
 */
export async function runPipeline(options: PipelineOptions = {}): Promise<PipelineReport> {
  const now = options.now ?? (() => new Date());
  const log = options.log ?? (() => {});
  const startedAt = now();
  const since = new Date(startedAt.getTime() - (options.sinceHours ?? DEFAULT_SINCE_HOURS) * 3_600_000);
  const connectors = options.connectors ?? connectorsFor();

  // Recopilación, con cada fuente aislada.
  const failedSources: PipelineReport['failedSources'] = [];
  const batches = await Promise.all(
    connectors.map(async (c) => {
      try {
        const items = await c.fetchItems({ since });
        log(`fuente ${c.source.id}: ${items.length} ítems`);
        return items;
      } catch (err) {
        failedSources.push({ sourceId: c.source.id, error: (err as Error).message });
        log(`fuente ${c.source.id}: ERROR ${(err as Error).message}`);
        return [] as SourceItem[];
      }
    }),
  );
  // Un mismo ítem puede llegar dos veces de la misma fuente.
  const byId = new Map<string, SourceItem>();
  for (const it of batches.flat()) byId.set(it.id, it);
  // Lo recordado de corridas anteriores, si su fuente sigue activa. El tipo y el origen salen de
  // la configuración actual, por si cambió.
  const active = new Map(connectors.map((c) => [c.source.id, c.source]));
  let remembered = 0;
  for (const it of options.previousItems ?? []) {
    const source = active.get(it.sourceId);
    if (!source || byId.has(it.id) || new Date(it.publishedAt) < since) continue;
    byId.set(it.id, {
      ...it,
      sourceName: source.name,
      sourceKind: source.kind,
      origin: source.origin,
      discoveryOnly: source.discoveryOnly ?? source.kind === 'aggregator',
    });
    remembered++;
  }
  if (remembered > 0) log(`${remembered} ítems de corridas anteriores que los feeds ya no muestran`);
  const collected = [...byId.values()];
  const items = collected.filter((it) => !isRollingCoverage(it));
  const skipped = collected.length - items.length;
  if (skipped > 0) log(`${skipped} coberturas en vivo o páginas de servicio descartadas`);

  const clusters = clusterItems(items);
  log(`${items.length} ítems en ${clusters.length} hechos`);

  // Medios que una nota puede citar: los configurados y los de los conectores de esta corrida.
  const definitions = new Map([...sourceDefinitions, ...connectors.map((c) => c.source)].map((d) => [d.id, d]));
  const outlets = knownOutlets([...definitions.values()]);

  const takenSlugs = options.takenSlugs ?? new Set<string>();
  const covered = options.coveredSourceUrls ?? new Map<string, string>();
  const outcomes: ClusterOutcome[] = [];
  const candidates: Candidate[] = [];
  for (const cluster of clusters) {
    // Un grupo formado solo por agregadores no es noticia: es una pista.
    if (cluster.items.every((i) => i.discoveryOnly)) continue;

    const verification = verifyCluster(cluster, { outlets });
    const { category } = classifyCluster(cluster);
    const base = { cluster, verification, category, draft: null, grounding: null };

    const coveredBy = cluster.items.map((i) => covered.get(i.url)).find((slug) => slug !== undefined);
    if (coveredBy) {
      outcomes.push({ ...base, review: { decision: 'hold', reasons: [`Ya está cubierto por la nota "${coveredBy}".`] }, stage: 'already_covered', coveredBy });
      continue;
    }
    // Un hecho de una sola fuente queda en espera: no se lee ni se redacta.
    if (verification.status === 'unverified') {
      outcomes.push({ ...base, review: decideReview({ verification, category, draft: null, grounding: null }), stage: 'verified' });
      continue;
    }
    candidates.push({ cluster, verification, category });
  }

  candidates.sort(byPriority);
  const maxDrafts = options.maxDrafts ?? Number.POSITIVE_INFINITY;
  const maxPerCategory = options.maxPerCategory ?? editorial.drafting.maxPerCategoryPerRun;
  const perCategory = new Map<string, number>();
  let researched = 0;
  /** Por qué no se redacta nada más en esta corrida: se llegó al máximo o el redactor no tiene cupo. */
  let stopReason: string | null = null;

  for (const candidate of candidates) {
    const { cluster, category } = candidate;
    let { verification } = candidate;
    if (!stopReason && researched >= maxDrafts) {
      stopReason = `La corrida llegó al máximo de ${maxDrafts} borradores: se redacta en una próxima.`;
    }
    const section = category ?? '';
    const sameSection = perCategory.get(section) ?? 0;
    const deferReason =
      stopReason ??
      (sameSection >= maxPerCategory
        ? `Ya hay ${sameSection} ${sameSection === 1 ? 'borrador' : 'borradores'} ${category ? `de ${category}` : 'sin sección'} en esta corrida: se redacta en una próxima.`
        : null);
    if (deferReason) {
      outcomes.push({ cluster, verification, category, draft: null, grounding: null, review: { decision: 'hold', reasons: [deferReason] }, stage: 'deferred' });
      continue;
    }
    researched++;
    perCategory.set(section, sameSection + 1);

    // Con el texto completo se vuelve a verificar, porque la nota completa puede revelar que un
    // medio repite a otro ("según informó…", la firma de una agencia).
    let fullTexts = new Map<string, string>();
    if (options.fetcher) {
      fullTexts = await readFullTexts(cluster, options.fetcher);
      if (fullTexts.size > 0) {
        log(`texto completo de ${fullTexts.size} de ${cluster.items.filter((i) => !i.discoveryOnly).length} fuentes`, cluster.headline);
        verification = verifyCluster(cluster, { fullTexts, outlets });
      }
    }

    const outcome: ClusterOutcome = {
      cluster,
      verification,
      category,
      draft: null,
      grounding: null,
      review: { decision: 'hold', reasons: [] },
      stage: 'verified',
    };

    if (verification.status === 'unverified') {
      outcome.review = decideReview({ verification, category, draft: null, grounding: null });
      outcomes.push(outcome);
      continue;
    }

    const brief = buildBrief(cluster, verification, category, fullTexts);
    if (!options.writer) {
      outcome.stage = 'awaiting_writer';
      outcome.review = {
        decision: 'human_review',
        reasons: ['No hay redactor configurado: el hecho queda a la espera de redacción.', ...verification.reasons],
      };
      outcomes.push(outcome);
      continue;
    }

    try {
      outcome.draft = resolveSourceIds(await options.writer.write(brief), brief);
      outcome.stage = 'drafted';
      outcome.grounding = checkGrounding(outcome.draft, brief);
      outcome.category = outcome.draft.category ?? category;
      outcome.review = decideReview({ verification, category: outcome.category, draft: outcome.draft, grounding: outcome.grounding });
    } catch (err) {
      outcome.stage = 'writer_failed';
      outcome.error = err instanceof WriterError ? err.message : `Error: ${(err as Error).message}`;
      // Una falla temporal (proveedor saturado o sin cupo) se reintenta en la próxima corrida, y
      // en esta no se intenta más: cada intento recorre todos los modelos. El resto (clave
      // inválida, pedido rechazado) necesita que alguien lo mire.
      if (err instanceof WriterError && err.retryable) {
        outcome.review = { decision: 'hold', reasons: [`La redacción falló por un problema temporal; se reintenta en la próxima corrida. ${outcome.error}`] };
        stopReason = 'El redactor no respondió (sin cupo o saturado): se redacta en la próxima corrida.';
      } else {
        outcome.review = { decision: 'human_review', reasons: [`La redacción falló: ${outcome.error}`] };
      }
    }

    // Guardado aparte: una falla de la base no es una falla del redactor.
    if (outcome.stage === 'drafted' && options.publisher) {
      try {
        const article = draftToArticle(outcome, brief, now(), takenSlugs);
        outcome.savedAs = await options.publisher.save(article, { writer: outcome.draft?.writer });
        log(`guardada → ${outcome.savedAs}`, article.slug);
      } catch (err) {
        outcome.stage = 'save_failed';
        outcome.error = (err as Error).message;
        outcome.review = { decision: 'human_review', reasons: [`El borrador se redactó pero no se pudo guardar: ${outcome.error}`] };
        log(`no se pudo guardar un borrador: ${outcome.error}`, outcome.draft?.title);
      }
    }
    outcomes.push(outcome);
  }
  const deferred = outcomes.filter((o) => o.stage === 'deferred').length;
  if (deferred > 0) log(`${deferred} ${deferred === 1 ? 'hecho con varias fuentes queda' : 'hechos con varias fuentes quedan'} para la próxima corrida`);

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: now().toISOString(),
    collected: items.length,
    skipped,
    failedSources,
    clusters: clusters.length,
    outcomes,
  };
}
