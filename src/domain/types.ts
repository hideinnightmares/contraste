/**
 * Modelo editorial de Contraste.
 *
 * Estos tipos son el contrato entre el pipeline (que produce notas), el repositorio
 * (que las guarda) y el frontend (que las muestra). No dependen de Next ni de ninguna
 * base de datos: un CMS, una base SQL o el dataset DEMO tienen que poder producirlos.
 */

/** Formato editorial. Define cómo se presenta y cuánto dura en portada. */
export type ContentType =
  /** Hecho de actualidad. */
  | 'noticia'
  /** Interpretación editorial basada en hechos citados. Se distingue visualmente de la noticia. */
  | 'analisis'
  /** "Qué se sabe": ordena un tema con lo confirmado y lo pendiente. */
  | 'explicador'
  /** Dato breve, sin desarrollo. */
  | 'breve';

/**
 * Estado de verificación frente a las fuentes.
 * - verified: al menos dos fuentes independientes coinciden en los hechos centrales.
 * - partial: los hechos centrales están confirmados; algunos detalles no.
 * - developing: hecho en curso; la información puede cambiar.
 * - disputed: las fuentes se contradicen en algún punto. Solo se publica tras revisión humana y lo dice.
 * - unverified: una sola fuente o ninguna confirmación independiente. No se publica como hecho.
 */
export type VerificationStatus = 'verified' | 'partial' | 'developing' | 'disputed' | 'unverified';

export type Confidence = 'high' | 'medium' | 'low';

/** Ciclo de vida editorial. Solo `published` es visible para lectores. */
export type ReviewStatus = 'draft' | 'in_review' | 'approved' | 'rejected' | 'published';

export type SourceKind =
  | 'news_agency'
  | 'international_media'
  | 'local_media'
  | 'official'
  | 'public_document'
  | 'aggregator'
  | 'other';

export interface SourceRef {
  id: string;
  name: string;
  kind: SourceKind;
  /** URL consultada. `null` cuando la fuente no es pública (por ejemplo, un documento recibido). */
  url: string | null;
  consultedAt: string;
  /** Qué aporta esta fuente a la nota, en una línea. */
  contribution?: string;
  /** Fuente ficticia del dataset de demostración. */
  isDemo: boolean;
}

export type ClaimStatus = 'confirmed' | 'unconfirmed' | 'disputed';

export interface Claim {
  id: string;
  text: string;
  status: ClaimStatus;
  sourceIds: string[];
}

export interface Contradiction {
  topic: string;
  detail: string;
  sourceIds: string[];
}

export interface Verification {
  status: VerificationStatus;
  confidence: Confidence;
  /** Fuentes de distinto origen (no cuentan las réplicas de un mismo cable ni los agregadores). */
  independentSources: number;
  checkedAt: string;
  claims: Claim[];
  contradictions: Contradiction[];
  /** Controles automáticos aplicados al borrador. */
  checks: {
    dates: CheckResult;
    names: CheckResult;
    figures: CheckResult;
  };
}

export type CheckResult = 'passed' | 'flagged' | 'not_applicable';

export interface Review {
  status: ReviewStatus;
  /** Quién aprobó: una persona de la redacción o la política automática. */
  approvedBy: 'human' | 'policy' | null;
  reviewedAt: string | null;
  notes?: string;
}

export interface ImageCredit {
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
}

export interface ArticleImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  credit: ImageCredit;
  /** La foto ilustra el tema; no muestra el hecho narrado. */
  illustrative: boolean;
  /** Punto focal para recortes (porcentaje 0–100). */
  focal?: { x: number; y: number };
  /** Miniatura borrosa en base64 para mostrar mientras carga la foto. */
  blurDataURL?: string;
}

export type BodyBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  /** Bloque "Lo que se sabe / Lo que todavía no". */
  | { type: 'facts'; confirmed: string[]; unconfirmed: string[] }
  | { type: 'note'; tone: 'disputed' | 'context' | 'update'; title: string; text: string };

export interface Byline {
  kind: 'automated_desk' | 'staff';
  name: string;
}

export interface ArticleUpdate {
  at: string;
  text: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  dek: string;
  category: string;
  type: ContentType;
  tags: string[];
  body: BodyBlock[];
  image: ArticleImage | null;
  byline: Byline;
  publishedAt: string;
  updatedAt: string;
  /** Importancia editorial de 1 (baja) a 5 (máxima). La asigna el pipeline o la edición. */
  priority: 1 | 2 | 3 | 4 | 5;
  sources: SourceRef[];
  verification: Verification;
  review: Review;
  seo: { title?: string; description?: string };
  updates: ArticleUpdate[];
  /** Hecho en curso: se muestra la marca "En desarrollo". */
  live: boolean;
  isDemo: boolean;
}

/** Lo mínimo para listar una nota (portada, sección, buscador). */
export type ArticleSummary = Pick<
  Article,
  | 'id'
  | 'slug'
  | 'title'
  | 'dek'
  | 'category'
  | 'type'
  | 'tags'
  | 'image'
  | 'publishedAt'
  | 'updatedAt'
  | 'priority'
  | 'live'
  | 'isDemo'
  | 'byline'
> & {
  verification: Pick<Verification, 'status' | 'confidence' | 'independentSources'>;
  sourceCount: number;
  readingMinutes: number;
};

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
