import { sourceDefinitions } from '@/config/sources';
import type { SourceConnector } from './sources/connector';
import { RssConnector } from './sources/rss';
import { FixtureConnector } from './sources/fixture';
import { clusterItems } from './stages/dedupe';
import { verifyCluster } from './stages/verify';
import { classifyCluster } from './stages/classify';
import { buildBrief, type ArticleFetcher } from './stages/research';
import { checkGrounding } from './stages/grounding';
import { decideReview } from './stages/review';
import { draftToArticle, type Publisher } from './stages/publish';
import type { ArticleWriter } from './writers/writer';
import { WriterError, resolveSourceIds } from './writers/writer';
import type { ClusterOutcome, PipelineReport, SourceDefinition, SourceItem } from './types';

export interface PipelineOptions {
  /** Ventana de recopilación. */
  sinceHours?: number;
  connectors?: SourceConnector[];
  /** Sin redactor, el pipeline llega hasta la verificación y deja todo en espera. */
  writer?: ArticleWriter | null;
  fetcher?: ArticleFetcher;
  publisher?: Publisher | null;
  now?: () => Date;
  /** Slugs ya usados en el sitio, para no repetir. */
  takenSlugs?: Set<string>;
  /**
   * URL canónica de cada fuente ya citada por una nota existente → slug de esa nota. Un hecho
   * con alguna de esas URLs ya está cubierto: no se vuelve a redactar (ni a gastar cupo de IA).
   */
  coveredSourceUrls?: Map<string, string>;
  log?: (message: string) => void;
}

export function connectorsFor(definitions: SourceDefinition[] = sourceDefinitions): SourceConnector[] {
  return definitions
    .filter((d) => d.enabled)
    .map((d) => (d.connector === 'rss' ? new RssConnector(d) : new FixtureConnector(d)));
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
  const since = new Date(startedAt.getTime() - (options.sinceHours ?? 24) * 3_600_000);
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
  const items = [...byId.values()];

  const clusters = clusterItems(items);
  log(`${items.length} ítems en ${clusters.length} hechos`);

  const takenSlugs = options.takenSlugs ?? new Set<string>();
  const covered = options.coveredSourceUrls ?? new Map<string, string>();
  const outcomes: ClusterOutcome[] = [];
  for (const cluster of clusters) {
    // Un grupo formado solo por agregadores no es noticia: es una pista.
    if (cluster.items.every((i) => i.discoveryOnly)) continue;

    const verification = verifyCluster(cluster);
    const { category } = classifyCluster(cluster);

    const coveredBy = cluster.items.map((i) => covered.get(i.url)).find((slug) => slug !== undefined);
    if (coveredBy) {
      outcomes.push({
        cluster,
        verification,
        category,
        draft: null,
        grounding: null,
        review: { decision: 'hold', reasons: [`Ya está cubierto por la nota "${coveredBy}".`] },
        stage: 'already_covered',
        coveredBy,
      });
      continue;
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

    const brief = await buildBrief(cluster, verification, category, options.fetcher);
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
      // Una falla temporal (proveedor saturado o sin cupo) se reintenta en la próxima corrida;
      // el resto (clave inválida, pedido rechazado) necesita que alguien lo mire.
      outcome.review =
        err instanceof WriterError && err.retryable
          ? { decision: 'hold', reasons: [`La redacción falló por un problema temporal; se reintenta en la próxima corrida. ${outcome.error}`] }
          : { decision: 'human_review', reasons: [`La redacción falló: ${outcome.error}`] };
    }

    // Guardado aparte: una falla de la base no es una falla del redactor.
    if (outcome.stage === 'drafted' && options.publisher) {
      try {
        const article = draftToArticle(outcome, brief, now(), takenSlugs);
        outcome.savedAs = await options.publisher.save(article, { writer: outcome.draft?.writer });
        log(`guardada ${article.slug} → ${outcome.savedAs}`);
      } catch (err) {
        outcome.stage = 'save_failed';
        outcome.error = (err as Error).message;
        outcome.review = { decision: 'human_review', reasons: [`El borrador se redactó pero no se pudo guardar: ${outcome.error}`] };
        log(`no se pudo guardar "${outcome.draft?.title}": ${outcome.error}`);
      }
    }
    outcomes.push(outcome);
  }

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: now().toISOString(),
    collected: items.length,
    failedSources,
    clusters: clusters.length,
    outcomes,
  };
}
