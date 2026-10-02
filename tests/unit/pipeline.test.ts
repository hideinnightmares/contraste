import { describe, expect, it } from 'vitest';
import { sourceDefinitions } from '@/config/sources';
import { editorial } from '@/config/editorial';
import { connectorsFor, runPipeline } from '@/pipeline/run';
import { FixtureConnector } from '@/pipeline/sources/fixture';
import { parseFeed, RssConnector } from '@/pipeline/sources/rss';
import { canonicalUrl } from '@/pipeline/sources/connector';
import { clusterItems } from '@/pipeline/stages/dedupe';
import { verifyCluster } from '@/pipeline/stages/verify';
import { classifyCluster } from '@/pipeline/stages/classify';
import { extractFigures } from '@/pipeline/stages/figures';
import { checkGrounding } from '@/pipeline/stages/grounding';
import { decideReview } from '@/pipeline/stages/review';
import { buildBrief } from '@/pipeline/stages/research';
import { draftToArticle } from '@/pipeline/stages/publish';
import { articleSchema } from '@/domain/schema';
import type { ArticleWriter } from '@/pipeline/writers/writer';
import { WriterError } from '@/pipeline/writers/writer';
import type { DraftArticle, ResearchBrief, SourceItem } from '@/pipeline/types';

const NOW = new Date('2026-10-01T13:00:00Z');

async function fixtureItems(): Promise<SourceItem[]> {
  const connectors = sourceDefinitions.filter((d) => d.enabled).map((d) => new FixtureConnector(d, undefined, () => NOW));
  const batches = await Promise.all(connectors.map((c) => c.fetchItems({ since: new Date(NOW.getTime() - 86_400_000) })));
  return batches.flat();
}

describe('cifras', () => {
  it('interpreta números en formato argentino con multiplicadores y unidades', () => {
    const f = extractFigures('El fondo sería de US$ 15.000 millones y la obra mide 2,5 km; la inflación fue del 3,4%.', 'x');
    expect(f.map((x) => [x.value, x.unit])).toEqual([
      [15_000_000_000, 'usd'],
      [2.5, 'km'],
      [3.4, 'percent'],
    ]);
  });

  it('no confunde años con cifras', () => {
    expect(extractFigures('La ley de 2008 sigue vigente.', 'x')).toEqual([]);
  });
});

describe('deduplicación y verificación', () => {
  it('agrupa los ítems de prueba en tres hechos', async () => {
    const clusters = clusterItems(await fixtureItems());
    expect(clusters).toHaveLength(3);
    const sizes = clusters.map((c) => c.items.length).sort();
    expect(sizes).toEqual([1, 2, 5]);
  });

  it('un hecho con tres orígenes coincidentes queda verificado; la réplica y el agregador no suman', async () => {
    const clusters = clusterItems(await fixtureItems());
    const puente = clusters.find((c) => c.items.length === 5)!;
    const v = verifyCluster(puente);
    expect(v.status).toBe('verified');
    expect(v.confidence).toBe('high');
    expect(v.independentSources).toBe(3);
    expect(v.contradictions).toEqual([]);
  });

  it('detecta cifras contradictorias entre fuentes y marca la nota para revisión', async () => {
    const clusters = clusterItems(await fixtureItems());
    const puerto = clusters.find((c) => c.headline.includes('dragado'))!;
    const v = verifyCluster(puerto);
    expect(v.status).toBe('disputed');
    expect(v.contradictions).toHaveLength(1);
    expect(v.contradictions[0].detail).toContain('120 millones de dólares');
    expect(v.contradictions[0].detail).toContain('150 millones de dólares');
    const decision = decideReview({ verification: v, category: 'economia', draft: null, grounding: null, config: { ...editorial.review, mode: 'policy' } });
    expect(decision.decision).toBe('human_review');
  });

  it('una sola fuente con lenguaje condicional queda en espera', async () => {
    const clusters = clusterItems(await fixtureItems());
    const festival = clusters.find((c) => c.items.length === 1)!;
    const v = verifyCluster(festival);
    expect(v.status).toBe('unverified');
    expect(v.claims[0].status).toBe('unconfirmed');
    expect(decideReview({ verification: v, category: 'cultura', draft: null, grounding: null }).decision).toBe('hold');
  });

  it('detecta réplicas por similitud de texto aunque declaren otro origen', async () => {
    const items = await fixtureItems();
    const puenteItems = clusterItems(items).find((c) => c.items.length === 5)!;
    const disguised = { ...puenteItems, items: puenteItems.items.map((i) => (i.sourceId === 'fixture-replica' ? { ...i, origin: 'otro-medio' } : i)) };
    expect(verifyCluster(disguised).independentSources).toBe(3);
  });

  it('clasifica por palabras clave de la configuración de secciones', async () => {
    const clusters = clusterItems(await fixtureItems());
    const puerto = clusters.find((c) => c.headline.includes('dragado'))!;
    expect(classifyCluster(puerto).category).not.toBeNull();
  });
});

describe('fuentes', () => {
  it('parsea RSS 2.0 y Atom', () => {
    const rss = parseFeed(`<?xml version="1.0"?><rss version="2.0"><channel><title>x</title>
      <item><title>Título &amp; algo</title><link>https://example.com/a</link><description>&lt;p&gt;Resumen&lt;/p&gt;</description><pubDate>Wed, 01 Oct 2026 10:00:00 GMT</pubDate></item>
    </channel></rss>`);
    expect(rss).toHaveLength(1);
    expect(rss[0].url).toBe('https://example.com/a');
    expect(rss[0].publishedAt).toBe('2026-10-01T10:00:00.000Z');

    const atom = parseFeed(`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
      <entry><title>Entrada</title><link rel="alternate" href="https://example.com/b"/><summary>S</summary><updated>2026-10-01T09:00:00Z</updated></entry>
    </feed>`);
    expect(atom[0]).toMatchObject({ url: 'https://example.com/b', title: 'Entrada' });
  });

  it('el conector RSS reporta errores HTTP sin romper el pipeline', async () => {
    const def = { ...sourceDefinitions[0], id: 'rss-roto', connector: 'rss' as const, url: 'https://example.com/feed.xml' };
    const failing = new RssConnector(def, async () => new Response('no', { status: 503 }));
    const ok = new FixtureConnector(sourceDefinitions[0], undefined, () => NOW);
    const report = await runPipeline({ connectors: [failing, ok], now: () => NOW });
    expect(report.failedSources).toEqual([{ sourceId: 'rss-roto', error: 'El feed respondió HTTP 503' }]);
    expect(report.collected).toBeGreaterThan(0);
  });

  it('normaliza URLs quitando parámetros de campaña', () => {
    expect(canonicalUrl('https://www.example.com/nota/?utm_source=rss&id=3#top')).toBe('https://example.com/nota/?id=3');
  });

  it('solo habilita conectores de fuentes habilitadas', () => {
    expect(connectorsFor([{ ...sourceDefinitions[0], enabled: false }])).toHaveLength(0);
  });
});

function fakeDraft(brief: ResearchBrief, overrides: Partial<DraftArticle> = {}): DraftArticle {
  return {
    title: 'Habilitan el puente sobre el río Salado',
    dek: 'La obra de 420 metros permite el paso de camiones de hasta 45 toneladas.',
    type: 'noticia',
    category: 'sociedad',
    tags: ['Obras públicas'],
    body: [{ type: 'p', text: 'El puente de 420 metros quedó habilitado al tránsito.' }],
    seoDescription: 'Quedó habilitado el puente sobre el río Salado.',
    claims: [{ text: 'El puente quedó habilitado.', sourceIds: [brief.sources[0].id], status: 'confirmed' }],
    writer: 'prueba',
    ...overrides,
  };
}

describe('control posterior a la redacción', () => {
  it('rechaza cifras y nombres que no están en las fuentes', async () => {
    const cluster = clusterItems(await fixtureItems()).find((c) => c.items.length === 5)!;
    const brief = await buildBrief(cluster, verifyCluster(cluster), 'sociedad');
    expect(checkGrounding(fakeDraft(brief), brief).ok).toBe(true);

    const invented = fakeDraft(brief, {
      body: [{ type: 'p', text: 'La obra costó 90 millones de pesos, según dijo Juan Pérez Gómez.' }],
    });
    const g = checkGrounding(invented, brief);
    expect(g.ok).toBe(false);
    expect(g.ungroundedFigures).toContain('90 millones de pesos');
    expect(g.ungroundedNames).toContain('Juan Pérez Gómez');
  });

  it('detecta un dato que figura a la vez como confirmado y como no confirmado', async () => {
    const cluster = clusterItems(await fixtureItems()).find((c) => c.items.length === 2)!;
    const brief = await buildBrief(cluster, verifyCluster(cluster), 'economia');
    const facts = (confirmed: string[], unconfirmed: string[]) =>
      fakeDraft(brief, { body: [{ type: 'facts', confirmed, unconfirmed }] });

    const g = checkGrounding(
      facts(['El plazo de obra establecido es de 18 meses.'], ['El plazo de obra sería de 18 meses según trascendió.']),
      brief,
    );
    expect(g.ok).toBe(false);
    expect(g.contradictoryFacts).toEqual(['El plazo de obra establecido es de 18 meses.']);

    // Paráfrasis real de un borrador de Gemini: mismas cifras, otras palabras.
    const paraphrased = checkGrounding(
      facts(
        ['El plazo estipulado para la ejecución de los trabajos es de 18 meses.'],
        ['El plazo de obra sería de 18 meses según fuentes de la administración portuaria.'],
      ),
      brief,
    );
    expect(paraphrased.contradictoryFacts).toHaveLength(1);

    const distinct = checkGrounding(
      facts(
        ['El plazo de obra es de 18 meses.', 'El canal tiene 18 metros de profundidad.'],
        ['El monto difiere entre las fuentes.', 'Habría 18 empresas interesadas en la licitación.'],
      ),
      brief,
    );
    expect(distinct.contradictoryFacts).toEqual([]);
  });
});

describe('política de revisión', () => {
  it('en modo humano, todo pasa por una persona', async () => {
    const cluster = clusterItems(await fixtureItems()).find((c) => c.items.length === 5)!;
    const v = verifyCluster(cluster);
    const brief = await buildBrief(cluster, v, 'sociedad');
    const draft = fakeDraft(brief);
    const grounding = checkGrounding(draft, brief);
    expect(decideReview({ verification: v, category: 'sociedad', draft, grounding, config: { ...editorial.review, mode: 'human' } }).decision).toBe('human_review');
    expect(decideReview({ verification: v, category: 'sociedad', draft, grounding, config: { ...editorial.review, mode: 'policy' } }).decision).toBe('auto_publish');
    expect(decideReview({ verification: v, category: 'politica', draft, grounding, config: { ...editorial.review, mode: 'policy' } }).decision).toBe('human_review');
  });
});

describe('pipeline completo', () => {
  it('con un redactor de prueba, genera notas válidas y registra fallos del redactor', async () => {
    let calls = 0;
    const writer: ArticleWriter = {
      name: 'prueba',
      async write(brief) {
        calls++;
        if (brief.verification.status === 'disputed') throw new WriterError('servicio caído', true);
        return fakeDraft(brief);
      },
    };
    const saved: string[] = [];
    const report = await runPipeline({
      connectors: sourceDefinitions.filter((d) => d.enabled).map((d) => new FixtureConnector(d, undefined, () => NOW)),
      writer,
      publisher: {
        async save(article) {
          expect(articleSchema.safeParse(article).success).toBe(true);
          saved.push(article.slug);
          return article.slug;
        },
      },
      now: () => NOW,
    });
    expect(calls).toBe(2); // el hecho de fuente única no llega al redactor
    // La falla era temporal: el hecho queda en espera para la próxima corrida.
    expect(report.outcomes.find((o) => o.stage === 'writer_failed')?.review.decision).toBe('hold');
    expect(saved).toHaveLength(1);
  });

  it('convierte el borrador en una nota "en revisión" con fuentes y verificación', async () => {
    const cluster = clusterItems(await fixtureItems()).find((c) => c.items.length === 5)!;
    const v = verifyCluster(cluster);
    const brief = await buildBrief(cluster, v, 'sociedad');
    const draft = fakeDraft(brief);
    const article = draftToArticle(
      { cluster, verification: v, category: 'sociedad', draft, grounding: checkGrounding(draft, brief), review: { decision: 'human_review', reasons: ['x'] }, stage: 'drafted' },
      brief,
      NOW,
      new Set(['habilitan-el-puente-sobre-el-rio-salado']),
    );
    expect(article.slug).toBe('habilitan-el-puente-sobre-el-rio-salado-2');
    expect(article.review.status).toBe('in_review');
    // Las fuentes de prueba son ficticias: la nota queda marcada como demostración.
    expect(article.isDemo).toBe(true);
    expect(article.sources.every((s) => s.isDemo)).toBe(true);
    expect(article.verification.independentSources).toBe(3);
    expect(articleSchema.safeParse(article).success).toBe(true);
  });

  it('una nota con fuentes reales es real, y el esquema no acepta una nota real con fuentes de prueba', async () => {
    const cluster = clusterItems(await fixtureItems()).find((c) => c.items.length === 5)!;
    const real = { ...cluster, items: cluster.items.map((it) => ({ ...it, isDemo: false })) };
    const v = verifyCluster(real);
    const brief = await buildBrief(real, v, 'sociedad');
    const draft = fakeDraft(brief);
    const article = draftToArticle(
      { cluster: real, verification: v, category: 'sociedad', draft, grounding: checkGrounding(draft, brief), review: { decision: 'human_review', reasons: ['x'] }, stage: 'drafted' },
      brief,
      NOW,
      new Set(),
    );
    expect(article.isDemo).toBe(false);
    expect(articleSchema.safeParse(article).success).toBe(true);

    const mezclada = { ...article, sources: article.sources.map((s, i) => (i === 0 ? { ...s, isDemo: true } : s)) };
    const result = articleSchema.safeParse(mezclada);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message).join(' ')).toMatch(/fuentes de prueba/);
  });
});
