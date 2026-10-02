import { describe, expect, it } from 'vitest';
import { sourceDefinitions } from '@/config/sources';
import { runPipeline } from '@/pipeline/run';
import { FixtureConnector } from '@/pipeline/sources/fixture';
import { coverageFromRows, supabaseFromEnv } from '@/pipeline/storage/supabase';
import type { Publisher } from '@/pipeline/stages/publish';
import type { ArticleWriter } from '@/pipeline/writers/writer';
import type { DraftArticle, ResearchBrief } from '@/pipeline/types';

const NOW = new Date('2026-10-01T13:00:00Z');
const connectors = () => sourceDefinitions.filter((d) => d.enabled).map((d) => new FixtureConnector(d, undefined, () => NOW));

function draftFor(brief: ResearchBrief): DraftArticle {
  return {
    title: brief.headline,
    dek: 'Bajada de prueba.',
    type: 'noticia',
    category: 'sociedad',
    tags: ['prueba'],
    body: [{ type: 'p', text: brief.sources[0].text }],
    seoDescription: 'Descripción.',
    claims: [{ text: 'Afirmación.', sourceIds: [brief.sources[0].id], status: 'confirmed' }],
    writer: 'prueba:modelo-1',
  };
}

function countingWriter() {
  const written: string[] = [];
  const writer: ArticleWriter = {
    name: 'prueba',
    async write(brief) {
      written.push(brief.headline);
      return draftFor(brief);
    },
  };
  return { writer, written };
}

describe('pipeline con base de datos', () => {
  it('un hecho que ya cubre una nota existente no se vuelve a redactar', async () => {
    const first = await runPipeline({ connectors: connectors(), now: () => NOW });
    const puente = first.outcomes.find((o) => o.cluster.items.length === 5)!;
    const covered = new Map([[puente.cluster.items[0].url, 'habilitan-el-puente']]);

    const { writer, written } = countingWriter();
    const report = await runPipeline({ connectors: connectors(), now: () => NOW, writer, coveredSourceUrls: covered });
    const outcome = report.outcomes.find((o) => o.cluster.id === puente.cluster.id)!;

    expect(outcome.stage).toBe('already_covered');
    expect(outcome.coveredBy).toBe('habilitan-el-puente');
    expect(outcome.review.decision).toBe('hold');
    expect(written).not.toContain(puente.cluster.headline);
  });

  it('guarda el borrador con el modelo que lo escribió', async () => {
    const saved: { slug: string; writer?: string }[] = [];
    const publisher: Publisher = {
      async save(article, meta) {
        saved.push({ slug: article.slug, writer: meta?.writer });
        return 'prueba';
      },
    };
    const { writer } = countingWriter();
    const report = await runPipeline({ connectors: connectors(), now: () => NOW, writer, publisher });
    expect(saved.length).toBeGreaterThan(0);
    expect(saved.every((s) => s.writer === 'prueba:modelo-1')).toBe(true);
    expect(report.outcomes.filter((o) => o.savedAs === 'prueba')).toHaveLength(saved.length);
  });

  it('si la base falla, se informa como falla de guardado y no del redactor', async () => {
    const publisher: Publisher = {
      async save() {
        throw new Error('la base no responde');
      },
    };
    const { writer } = countingWriter();
    const report = await runPipeline({ connectors: connectors(), now: () => NOW, writer, publisher });
    const failed = report.outcomes.filter((o) => o.stage === 'save_failed');
    expect(failed.length).toBeGreaterThan(0);
    expect(failed[0].draft).not.toBeNull();
    expect(failed[0].review.decision).toBe('human_review');
    expect(failed[0].review.reasons.join(' ')).toMatch(/no se pudo guardar: la base no responde/);
    expect(report.outcomes.some((o) => o.stage === 'writer_failed')).toBe(false);
  });
});

describe('almacenamiento en Supabase', () => {
  it('arma el mapa de fuentes cubiertas a partir de las notas', () => {
    const covered = coverageFromRows([
      { slug: 'nota-a', sources: [{ url: 'https://medio.com/a' }, { url: null }] },
      { slug: 'nota-b', sources: [{ url: 'https://medio.com/a' }, { url: 'https://medio.com/b' }] },
      { slug: 'sin-fuentes', sources: null },
    ]);
    expect([...covered]).toEqual([
      ['https://medio.com/a', 'nota-a'],
      ['https://medio.com/b', 'nota-b'],
    ]);
  });

  it('sin configuración no usa la base; a medias o con una clave que no es secreta, avisa', () => {
    expect(supabaseFromEnv({})).toBeNull();
    expect(() => supabaseFromEnv({ SUPABASE_URL: 'https://x.supabase.co' })).toThrow(/hacen falta las dos/);
    expect(() => supabaseFromEnv({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SECRET_KEY: 'sb_publishable_abc' })).toThrow(
      /sb_secret_/,
    );
    expect(supabaseFromEnv({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_prueba' })).not.toBeNull();
    // La dirección pública del sitio (.env.production) sirve si .env.pipeline solo trae la clave,
    // pero por sí sola no activa la base.
    expect(supabaseFromEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' })).toBeNull();
    expect(supabaseFromEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_prueba' })).not.toBeNull();
  });
});

describe('citas del redactor', () => {
  it('el dossier nombra las fuentes F1, F2… y las citas vuelven a los ids reales', async () => {
    const { buildBrief } = await import('@/pipeline/stages/research');
    const { clusterItems } = await import('@/pipeline/stages/dedupe');
    const { verifyCluster } = await import('@/pipeline/stages/verify');
    const { renderBrief, resolveSourceIds } = await import('@/pipeline/writers/writer');
    const items = (await Promise.all(connectors().map((c) => c.fetchItems({ since: new Date(NOW.getTime() - 86_400_000) })))).flat();
    const cluster = clusterItems(items).find((c) => c.items.length === 2)!;
    const brief = await buildBrief(cluster, verifyCluster(cluster), 'economia');
    const [a, b] = brief.sources;

    expect(renderBrief(brief)).toContain('<fuente id="F1"');
    expect(renderBrief(brief)).not.toContain(a.id);

    const resolved = resolveSourceIds(
      {
        claims: [
          { sourceIds: ['F1', 'f2'] },
          { sourceIds: [a.id, a.id] },
          // Lo que hizo Gemini en la corrida real: el id de la fuente configurada, sin la URL.
          { sourceIds: [b.id.split(':')[0]] },
          { sourceIds: ['F9', 'inventada'] },
        ],
      },
      brief,
    );
    expect(resolved.claims.map((c) => c.sourceIds)).toEqual([[a.id, b.id], [a.id], [b.id], ['F9', 'inventada']]);
  });
});
