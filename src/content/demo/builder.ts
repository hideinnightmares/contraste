import type {
  Article,
  BodyBlock,
  CheckResult,
  Claim,
  Confidence,
  ContentType,
  Contradiction,
  VerificationStatus,
} from '@/domain/types';
import { demoImage, type PhotoKey } from './images';
import { demoSources, type DemoSourceKey } from './sources';

/**
 * Constructor de notas DEMO.
 *
 * Las fechas se expresan en minutos antes de un "ancla" (la hora en punto actual),
 * para que la portada de demostración se lea como un día real de publicación en
 * cualquier momento en que se abra. El contenido no cambia; solo la hora.
 */
export interface DemoSpec {
  slug: string;
  title: string;
  dek: string;
  category: string;
  type?: ContentType;
  tags: string[];
  image?: PhotoKey;
  minutesAgo: number;
  updatedMinutesAgo?: number;
  priority: Article['priority'];
  live?: boolean;
  sources: [DemoSourceKey, string][];
  status: VerificationStatus;
  confidence?: Confidence;
  claims?: { text: string; status: Claim['status']; sources: DemoSourceKey[] }[];
  contradictions?: { topic: string; detail: string; sources: DemoSourceKey[] }[];
  figures?: CheckResult;
  updates?: { minutesAgo: number; text: string }[];
  body: BodyBlock[];
  seoTitle?: string;
}

const MINUTE = 60_000;

/** Hora en punto anterior: el contenido es estable durante cada hora. */
export function demoAnchor(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

export function buildDemoArticle(spec: DemoSpec, anchor: Date): Article {
  const at = (minutes: number) => new Date(anchor.getTime() - minutes * MINUTE).toISOString();
  const published = at(spec.minutesAgo);
  const updatedMinutes = Math.min(
    spec.updatedMinutesAgo ?? spec.minutesAgo,
    ...(spec.updates ?? []).map((u) => u.minutesAgo),
  );
  const sourceId = (key: DemoSourceKey) => `${spec.slug}--${key}`;

  const sources = spec.sources.map(([key, contribution], i) => ({
    id: sourceId(key),
    name: demoSources[key].name,
    kind: demoSources[key].kind,
    url: `https://example.com/demo/${key}/${spec.slug}`,
    consultedAt: at(spec.minutesAgo + 20 + i * 7),
    contribution,
    isDemo: true,
  }));

  // Independientes: orígenes editoriales distintos, sin contar agregadores.
  const independentSources = new Set(
    spec.sources.filter(([key]) => demoSources[key].kind !== 'aggregator').map(([key]) => demoSources[key].group),
  ).size;

  const contradictions: Contradiction[] = (spec.contradictions ?? []).map((c) => ({
    topic: c.topic,
    detail: c.detail,
    sourceIds: c.sources.map(sourceId),
  }));

  const claims: Claim[] = (spec.claims ?? []).map((c, i) => ({
    id: `${spec.slug}--c${i + 1}`,
    text: c.text,
    status: c.status,
    sourceIds: c.sources.map(sourceId),
  }));

  const defaultConfidence: Record<VerificationStatus, Confidence> = {
    verified: 'high',
    partial: 'medium',
    developing: 'medium',
    disputed: 'medium',
    unverified: 'low',
  };

  return {
    id: `demo-${spec.slug}`,
    slug: spec.slug,
    title: spec.title,
    dek: spec.dek,
    category: spec.category,
    type: spec.type ?? 'noticia',
    tags: spec.tags,
    body: spec.body,
    image: spec.image ? demoImage(spec.image) : null,
    byline: { kind: 'automated_desk', name: 'Mesa editorial de Contraste' },
    publishedAt: published,
    updatedAt: at(updatedMinutes),
    priority: spec.priority,
    sources,
    verification: {
      status: spec.status,
      confidence: spec.confidence ?? defaultConfidence[spec.status],
      independentSources,
      checkedAt: at(Math.max(0, updatedMinutes - 5)),
      claims,
      contradictions,
      checks: {
        dates: 'passed',
        names: 'passed',
        figures: spec.figures ?? (contradictions.length > 0 ? 'flagged' : 'passed'),
      },
    },
    review: {
      status: 'published',
      approvedBy: 'human',
      reviewedAt: at(spec.minutesAgo + 2),
      notes: contradictions.length > 0 ? 'Publicada con la discrepancia señalada en el texto.' : undefined,
    },
    seo: { title: spec.seoTitle },
    updates: (spec.updates ?? [])
      .slice()
      .sort((a, b) => a.minutesAgo - b.minutesAgo)
      .map((u) => ({ at: at(u.minutesAgo), text: u.text })),
    live: spec.live ?? false,
    isDemo: true,
  };
}
