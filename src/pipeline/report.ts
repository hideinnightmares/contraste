import type { ClusterOutcome, PipelineReport } from './types';

/**
 * Lo que se guarda de cada corrida. El informe completo vive en memoria; lo guardado no lleva el
 * texto de las notas ajenas que traen algunos feeds, y el de la base es compacto: con las fuentes
 * reales, una corrida junta cientos de ítems y guardarlos todos llenaría la base del plan gratis.
 */

/** El informe completo sin el texto de las notas (`content`): no guardamos texto ajeno. */
export function withoutFeedText(report: PipelineReport): PipelineReport {
  return {
    ...report,
    outcomes: report.outcomes.map((o) => ({
      ...o,
      cluster: { ...o.cluster, items: o.cluster.items.map((item) => ({ ...item, content: undefined })) },
    })),
  };
}

/** Un hecho que llegó a investigación: sus fuentes, la verificación y qué se decidió. */
export interface StoredOutcome {
  headline: string;
  category: string | null;
  stage: ClusterOutcome['stage'];
  verification: Pick<ClusterOutcome['verification'], 'status' | 'confidence' | 'independentSources' | 'origins' | 'contradictions' | 'reasons'>;
  review: ClusterOutcome['review'];
  grounding: ClusterOutcome['grounding'];
  draft: { title: string; writer: string } | null;
  error?: string;
  savedAs?: string;
  sources: { sourceId: string; url: string; title: string; publishedAt: string }[];
}

export interface StoredReport {
  startedAt: string;
  finishedAt: string;
  collected: number;
  clusters: number;
  failedSources: PipelineReport['failedSources'];
  /** Cantidad de hechos en cada etapa. */
  stages: Partial<Record<ClusterOutcome['stage'], number>>;
  /** Hechos con una sola fuente, en espera de confirmación (solo se cuentan). */
  singleSource: number;
  /** Lo que se investigó y redactó (o se intentó), con detalle. */
  researched: StoredOutcome[];
  /** Lo que tenía varias fuentes y quedó para una próxima corrida. */
  deferred: { headline: string; independentSources: number }[];
}

/** Etapas que no llegan a investigación: se cuentan, pero no se detallan. */
const NOT_RESEARCHED = new Set<ClusterOutcome['stage']>(['verified', 'already_covered', 'deferred']);

/** Informe para la base: unos pocos KB por corrida. */
export function compactReport(report: PipelineReport): StoredReport {
  const stages: StoredReport['stages'] = {};
  for (const o of report.outcomes) stages[o.stage] = (stages[o.stage] ?? 0) + 1;
  return {
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    collected: report.collected,
    clusters: report.clusters,
    failedSources: report.failedSources,
    stages,
    singleSource: report.outcomes.filter((o) => o.stage === 'verified' && o.verification.status === 'unverified').length,
    researched: report.outcomes
      .filter((o) => !NOT_RESEARCHED.has(o.stage))
      .map((o) => ({
        headline: o.cluster.headline,
        category: o.category,
        stage: o.stage,
        verification: {
          status: o.verification.status,
          confidence: o.verification.confidence,
          independentSources: o.verification.independentSources,
          origins: o.verification.origins,
          contradictions: o.verification.contradictions,
          reasons: o.verification.reasons,
        },
        review: o.review,
        grounding: o.grounding,
        draft: o.draft ? { title: o.draft.title, writer: o.draft.writer } : null,
        ...(o.error ? { error: o.error } : {}),
        ...(o.savedAs ? { savedAs: o.savedAs } : {}),
        sources: o.cluster.items.map((i) => ({ sourceId: i.sourceId, url: i.url, title: i.title, publishedAt: i.publishedAt })),
      })),
    deferred: report.outcomes
      .filter((o) => o.stage === 'deferred')
      .map((o) => ({ headline: o.cluster.headline, independentSources: o.verification.independentSources })),
  };
}
