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
  enabled: boolean;
  /** Solo sirve para descubrir temas (agregadores): nunca cuenta como fuente. */
  discoveryOnly?: boolean;
  language?: string;
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
  stage: 'verified' | 'already_covered' | 'awaiting_writer' | 'drafted' | 'writer_failed' | 'save_failed';
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
  failedSources: { sourceId: string; error: string }[];
  clusters: number;
  outcomes: ClusterOutcome[];
}
