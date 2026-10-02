import { z } from 'zod';
import { getCategory } from '@/config/categories';

/**
 * Validación de notas en el borde del repositorio. Cualquier origen (dataset DEMO,
 * base de datos, CMS, pipeline) pasa por acá antes de llegar a una página: una nota
 * mal formada falla en la carga, no en la pantalla del lector.
 */

const isoDate = z.iso.datetime({ offset: true });

const source = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['news_agency', 'international_media', 'local_media', 'official', 'public_document', 'aggregator', 'other']),
  url: z.url().nullable(),
  consultedAt: isoDate,
  contribution: z.string().optional(),
  isDemo: z.boolean(),
});

const check = z.enum(['passed', 'flagged', 'not_applicable']);

const block = z.discriminatedUnion('type', [
  z.object({ type: z.literal('p'), text: z.string().min(1) }),
  z.object({ type: z.literal('h2'), text: z.string().min(1) }),
  z.object({ type: z.literal('list'), items: z.array(z.string().min(1)).min(1), ordered: z.boolean().optional() }),
  z.object({ type: z.literal('facts'), confirmed: z.array(z.string()), unconfirmed: z.array(z.string()) }),
  z.object({
    type: z.literal('note'),
    tone: z.enum(['disputed', 'context', 'update']),
    title: z.string().min(1),
    text: z.string().min(1),
  }),
]);

export const articleSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug inválido'),
    title: z.string().min(10).max(160),
    dek: z.string().min(20).max(320),
    category: z.string().refine((slug) => getCategory(slug) !== undefined, 'sección inexistente'),
    type: z.enum(['noticia', 'analisis', 'explicador', 'breve']),
    tags: z.array(z.string().min(2)).max(8),
    body: z.array(block).min(1),
    image: z
      .object({
        src: z.string().startsWith('/'),
        alt: z.string().min(10, 'el texto alternativo tiene que describir la imagen'),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        caption: z.string().optional(),
        credit: z.object({
          author: z.string().min(1),
          license: z.string().min(1),
          licenseUrl: z.url().nullable(),
          sourceUrl: z.url(),
        }),
        illustrative: z.boolean(),
        focal: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional(),
        blurDataURL: z.string().startsWith('data:image/').optional(),
      })
      .nullable(),
    byline: z.object({ kind: z.enum(['automated_desk', 'staff']), name: z.string().min(1) }),
    publishedAt: isoDate,
    updatedAt: isoDate,
    priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    sources: z.array(source),
    verification: z.object({
      status: z.enum(['verified', 'partial', 'developing', 'disputed', 'unverified']),
      confidence: z.enum(['high', 'medium', 'low']),
      independentSources: z.number().int().min(0),
      checkedAt: isoDate,
      claims: z.array(
        z.object({
          id: z.string(),
          text: z.string().min(1),
          status: z.enum(['confirmed', 'unconfirmed', 'disputed']),
          sourceIds: z.array(z.string()),
        }),
      ),
      contradictions: z.array(z.object({ topic: z.string(), detail: z.string(), sourceIds: z.array(z.string()) })),
      checks: z.object({ dates: check, names: check, figures: check }),
    }),
    review: z.object({
      status: z.enum(['draft', 'in_review', 'approved', 'rejected', 'published']),
      approvedBy: z.enum(['human', 'policy']).nullable(),
      reviewedAt: isoDate.nullable(),
      notes: z.string().optional(),
    }),
    seo: z.object({ title: z.string().optional(), description: z.string().optional() }),
    updates: z.array(z.object({ at: isoDate, text: z.string().min(1) })),
    live: z.boolean(),
    isDemo: z.boolean(),
  })
  .superRefine((a, ctx) => {
    const ids = new Set(a.sources.map((s) => s.id));
    for (const claim of a.verification.claims) {
      for (const id of claim.sourceIds) {
        if (!ids.has(id)) ctx.addIssue({ code: 'custom', message: `afirmación "${claim.id}" cita una fuente inexistente (${id})` });
      }
    }
    if (a.review.status === 'published' && a.verification.status === 'unverified') {
      ctx.addIssue({ code: 'custom', message: 'una nota sin verificar no puede publicarse' });
    }
    if (a.review.status === 'published' && a.verification.status === 'disputed' && a.review.approvedBy !== 'human') {
      ctx.addIssue({ code: 'custom', message: 'una nota con fuentes en disputa solo se publica con aprobación humana' });
    }
    if (a.verification.status === 'disputed' && a.verification.contradictions.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'estado "disputed" sin contradicciones registradas' });
    }
    if (!a.isDemo && a.sources.some((s) => s.isDemo)) {
      ctx.addIssue({ code: 'custom', message: 'una nota real no puede citar fuentes de prueba: tiene que estar marcada como demostración' });
    }
    if (a.sources.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'toda nota publicada indica sus fuentes' });
    }
    if (a.verification.independentSources > a.sources.length) {
      ctx.addIssue({ code: 'custom', message: 'más fuentes independientes que fuentes citadas' });
    }
    if (new Date(a.updatedAt) < new Date(a.publishedAt)) {
      ctx.addIssue({ code: 'custom', message: 'updatedAt anterior a publishedAt' });
    }
  });

export type ArticleInput = z.input<typeof articleSchema>;
