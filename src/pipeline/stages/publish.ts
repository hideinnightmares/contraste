import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { editorial } from '@/config/editorial';
import { articleSchema } from '@/domain/schema';
import { slugify, truncate } from '@/domain/text';
import type { Article } from '@/domain/types';
import type { ClusterOutcome, ResearchBrief } from '../types';

/**
 * Convierte un borrador aprobado (por política o para revisión) en una nota con
 * el mismo formato que lee el sitio. Incluye fuentes, verificación y SEO.
 */
export function draftToArticle(outcome: ClusterOutcome, brief: ResearchBrief, now: Date, takenSlugs: Set<string>): Article {
  const draft = outcome.draft;
  if (!draft) throw new Error('No hay borrador para convertir.');
  const base = slugify(draft.title) || outcome.cluster.id;
  let slug = base;
  for (let n = 2; takenSlugs.has(slug); n++) slug = `${base}-${n}`;
  takenSlugs.add(slug);

  const v = outcome.verification;
  const published = outcome.review.decision === 'auto_publish';
  // Una sola fuente de prueba alcanza para que la nota sea de demostración: nunca se guarda
  // como real algo armado con información ficticia.
  const isDemo = brief.sources.some((s) => s.isDemo);
  const iso = now.toISOString();
  return {
    id: `auto-${outcome.cluster.id}`,
    slug,
    title: draft.title,
    dek: draft.dek,
    category: draft.category,
    type: draft.type,
    tags: draft.tags,
    body: draft.body,
    image: null,
    byline: { kind: 'automated_desk', name: 'Mesa editorial de Contraste' },
    publishedAt: iso,
    updatedAt: iso,
    priority: v.confidence === 'high' ? 3 : 2,
    sources: brief.sources.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      url: s.url.startsWith('http') ? s.url : null,
      consultedAt: iso,
      isDemo: s.isDemo,
    })),
    verification: {
      status: v.status,
      confidence: v.confidence,
      independentSources: v.independentSources,
      checkedAt: iso,
      claims: draft.claims.map((c, i) => ({ id: `${outcome.cluster.id}-d${i + 1}`, text: c.text, status: c.status, sourceIds: c.sourceIds })),
      contradictions: v.contradictions,
      checks: {
        dates: 'passed',
        names: outcome.grounding?.ungroundedNames.length ? 'flagged' : 'passed',
        figures: outcome.grounding?.ungroundedFigures.length || v.contradictions.length ? 'flagged' : 'passed',
      },
    },
    review: {
      status: published ? 'published' : 'in_review',
      approvedBy: published ? 'policy' : null,
      reviewedAt: published ? iso : null,
      notes: outcome.review.reasons.join(' '),
    },
    seo: {
      title: truncate(draft.title, editorial.seo.maxTitleLength),
      description: truncate(draft.seoDescription || draft.dek, editorial.seo.maxDescriptionLength),
    },
    updates: [],
    live: false,
    isDemo,
  };
}

/**
 * Destino de las notas. `SupabaseStore` (pipeline/storage/supabase.ts) las guarda en la
 * base; `FilePublisher` escribe JSON en `.data/pipeline/` para probar sin base.
 * Devuelve una referencia legible de dónde quedó la nota.
 */
export interface Publisher {
  save(article: Article, meta?: { writer?: string }): Promise<string>;
}

export class FilePublisher implements Publisher {
  constructor(private readonly root = path.join(process.cwd(), '.data', 'pipeline')) {}

  async save(article: Article): Promise<string> {
    const check = articleSchema.safeParse(article);
    if (!check.success) {
      throw new Error(`La nota ${article.slug} no pasa la validación: ${check.error.issues.map((i) => i.message).join('; ')}`);
    }
    const dir = path.join(this.root, article.review.status === 'published' ? 'publicadas' : 'revision');
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${article.slug}.json`);
    await writeFile(file, JSON.stringify(article, null, 2), 'utf8');
    return file;
  }
}
