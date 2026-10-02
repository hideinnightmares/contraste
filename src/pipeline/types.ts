import type { BodyBlock, Claim, Confidence, ContentType, Contradiction, SourceKind, VerificationStatus } from '@/domain/types';

/**
 * Tipos del pipeline de automatización. Cada etapa recibe la salida de la anterior
 * y no conoce al frontend: el único punto de contacto es el `Publisher`, que
 * entrega una nota con el mismo formato que lee el repositorio.
 */

/** Definición de una fuente configurada. */
export interface SourceDefinition {
  id: string;
  name: string;
  kind: SourceKind;
  /** Origen editorial. Fuentes con el mismo origen no son independientes entre sí. */
  origin: string;
  connector: 'rss' | 'fixture';
  url: string;
  /**
   * Feeds de secciones del mismo medio, para los que dan pocas notas en el principal. Se leen
   * junto con `url`; si uno falla, se sigue con el resto.
   */
  extraFeeds?: string[];
  /** Portada del sitio: el probador de fuentes busca ahí el feed si la `url` deja de andar. */
  site?: string;
  enabled: boolean;
  /** Solo sirve para descubrir temas (agregadores): nunca cuenta como fuente. */
  discoveryOnly?: boolean;
  /**
   * Otros nombres con que la citan otros medios ("diario Clarín", "NA"), tal como se escriben:
   * se distinguen mayúsculas ("La Nación" es el diario; "la Nación", el Estado nacional).
   */
  aliases?: string[];
  language?: string;
}

/** Medio o agencia que otro medio puede citar como origen de una información. */
export interface KnownOutlet {
  name: string;
  origin: string;
  /** Nombres con que se lo cita, con sus mayúsculas. */
  aliases: string[];
}

/** Ítem tal como llega de un conector, ya normalizado. */
export interface SourceItem {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceKind: SourceKind;
  origin: string;
  discoveryOnly: boolean;
  url: string;
  title: string;
  summary: string;
  /** Texto completo si el conector o el investigador lo obtuvieron. */
  content?: string;
  publishedAt: string;
  fetchedAt: string;
  /** Viene de una fuente de prueba (conector `fixture`): es ficticio. */
  isDemo: boolean;
}

/** Grupo de ítems que cuentan el mismo hecho. */
export interface StoryCluster {
  id: string;
  items: SourceItem[];
  /** Título representativo (del ítem de fuente primaria o más completo). */
  headline: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface Figure {
  raw: string;
  value: number;
  unit: string | null;
  context: string[];
  /** La palabra justo antes de la cifra ("los" en "a los 96 años", "durante" en "durante 22 años"). */
  lead: string;
  itemId: string;
}

export interface VerificationReport {
  clusterId: string;
  status: VerificationStatus;
  confidence: Confidence;
  independentSources: number;
  /** Orígenes editoriales distintos (sin agregadores ni réplicas). */
  origins: string[];
  contradictions: Contradiction[];
  claims: Claim[];
  figures: Figure[];
  reasons: string[];
}

/** Lo que recibe el redactor: solo información ya contrastada. */
export interface ResearchBrief {
  clusterId: string;
  headline: string;
  category: string | null;
  sources: { id: string; name: string; kind: SourceKind; url: string; publishedAt: string; text: string; isDemo: boolean }[];
  verification: VerificationReport;
}

/** Borrador producido por el redactor (IA u otro). Siempre un borrador. */
export interface DraftArticle {
  title: string;
  dek: string;
  type: ContentType;
  category: string;
  tags: string[];
  body: BodyBlock[];
  seoDescription: string;
  /** Afirmaciones del texto con las fuentes que las respaldan. */
  claims: { text: string; sourceIds: string[]; status: 'confirmed' | 'unconfirmed' }[];
  writer: string;
}

export interface GroundingReport {
  ok: boolean;
  ungroundedFigures: string[];
  ungroundedNames: string[];
  unknownSourceIds: string[];
  /** Datos que el borrador da a la vez como confirmados y como no confirmados. */
  contradictoryFacts: string[];
}

export type ReviewDecision =
  | { decision: 'auto_publish'; reasons: string[] }
  | { decision: 'human_review'; reasons: string[] }
  /** Esperar más fuentes antes de redactar. */
  | { decision: 'hold'; reasons: string[] };

export interface ClusterOutcome {
  cluster: StoryCluster;
  verification: VerificationReport;
  category: string | null;
  draft: DraftArticle | null;
  grounding: GroundingReport | null;
  review: ReviewDecision;
  /** `deferred`: tenía varias fuentes, pero la corrida llegó a su máximo de borradores (o el redactor se quedó sin cupo). */
  stage: 'verified' | 'already_covered' | 'deferred' | 'awaiting_writer' | 'drafted' | 'writer_failed' | 'save_failed';
  error?: string;
  /** Nota existente que ya cubre este hecho (stage `already_covered`). */
  coveredBy?: string;
  /** Dónde quedó guardada la nota, si se guardó. */
  savedAs?: string;
}

export interface PipelineReport {
  startedAt: string;
  finishedAt: string;
  collected: number;
  /** Coberturas en vivo y páginas de servicio descartadas (`editorial.collection.skipTitles`). */
  skipped: number;
  failedSources: { sourceId: string; error: string }[];
  clusters: number;
  outcomes: ClusterOutcome[];
}
