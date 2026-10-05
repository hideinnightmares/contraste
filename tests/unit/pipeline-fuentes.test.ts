import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { demoSources, realSources, wireAgencies } from '@/config/sources';
import { itemsToRemember, loadMemory, saveMemory } from '@/pipeline/memory';
import { compactReport, withoutFeedText } from '@/pipeline/report';
import { isRollingCoverage, runPipeline } from '@/pipeline/run';
import { WebArticleFetcher } from '@/pipeline/sources/article';
import { itemFromParts, type SourceConnector } from '@/pipeline/sources/connector';
import { COMMON_FEED_PATHS, feedLinks } from '@/pipeline/sources/discover';
import { parseFeed, RssConnector } from '@/pipeline/sources/rss';
import { citedOutlet, knownOutlets } from '@/pipeline/stages/attribution';
import { differs, extractFigures, sameSubject } from '@/pipeline/stages/figures';
import { GEMINI_OPT_OUT_AGENT, GeminiArticleWriter } from '@/pipeline/writers/gemini';
import { WriterError, type ArticleWriter } from '@/pipeline/writers/writer';
import type { DraftArticle, ResearchBrief, SourceDefinition } from '@/pipeline/types';

/**
 * Fuentes reales, probador de fuentes, tope de borradores por corrida e informes. Los sitios de
 * las pruebas son ficticios (dominios .test): nada sale a internet.
 */

const NOW = new Date('2026-10-02T15:00:00Z');

describe('fuentes configuradas', () => {
  it('cada fuente real tiene id y origen propios, feed https y portada', () => {
    const ids = [...realSources, ...demoSources].map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(realSources.map((s) => s.origin)).size).toBe(realSources.length);
    for (const s of realSources) {
      expect(s.connector).toBe('rss');
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.site).toMatch(/^https:\/\//);
    }
    expect(demoSources.every((s) => s.connector === 'fixture')).toBe(true);
  });

  it('Noticias Argentinas comparte origen con la agencia conocida: un medio que publica su cable cuenta como NA', () => {
    const na = realSources.find((s) => s.id === 'noticias-argentinas')!;
    expect(na.origin).toBe(wireAgencies.find((a) => a.name === 'Noticias Argentinas')!.origin);
    const outlets = knownOutlets(realSources, wireAgencies);
    expect(outlets.filter((o) => o.origin === na.origin)).toHaveLength(1);
    expect(citedOutlet('BUENOS AIRES (NA).- El Gobierno anunció…', outlets, 'clarin')?.origin).toBe(na.origin);
  });

  it('reconoce cómo se citan los medios y deja afuera a los organismos', () => {
    const outlets = knownOutlets(realSources, wireAgencies);
    expect(citedOutlet('El dato, según informó LA NACION, es preliminar.', outlets, 'clarin')?.origin).toBe('la-nacion');
    expect(citedOutlet('Según Página 12, la sesión se postergó.', outlets, 'clarin')?.origin).toBe('pagina12');
    expect(citedOutlet('Fuente: el diario Clarin.', outlets, 'infobae')?.origin).toBe('clarin');
    // "la Nación" en minúscula es el Estado nacional, no el diario.
    expect(citedOutlet('Según informó la Nación, los fondos llegarán en marzo.', outlets, 'clarin')).toBeNull();
    // Que un medio cite al INDEC no lo vuelve el INDEC: el dato oficial se verifica en su documento.
    expect(citedOutlet('La inflación fue de 2,1%, según informó el INDEC.', outlets, 'clarin')).toBeNull();
  });
});

describe('feeds', () => {
  it('lee también los feeds de secciones y sigue si uno falla', async () => {
    const rss = (slug: string) =>
      `<rss><channel><item><title>Nota ${slug}</title><link>https://diario.test/${slug}</link><pubDate>${NOW.toUTCString()}</pubDate></item></channel></rss>`;
    const def: SourceDefinition = {
      id: 'diario',
      name: 'Diario',
      kind: 'local_media',
      origin: 'diario',
      connector: 'rss',
      url: 'https://diario.test/feed',
      extraFeeds: ['https://diario.test/feed/politica', 'https://diario.test/feed/rota'],
      enabled: true,
    };
    const routes: Record<string, () => Response> = {
      'https://diario.test/feed': () => new Response(rss('portada')),
      'https://diario.test/feed/politica': () => new Response(rss('politica')),
    };
    const fetchImpl = (async (input: string | URL | Request) => routes[String(input)]?.() ?? new Response('', { status: 404 })) as typeof fetch;
    const items = await new RssConnector(def, fetchImpl).fetchItems({ since: new Date(NOW.getTime() - 3_600_000) });
    expect(items.map((i) => i.url)).toEqual(['https://diario.test/portada', 'https://diario.test/politica']);

    // Si falla el principal, la fuente falla.
    const broken = { ...def, url: 'https://diario.test/feed/rota' };
    await expect(new RssConnector(broken, fetchImpl).fetchItems({ since: new Date(0) })).rejects.toThrow('HTTP 404');
  });

  it('lee RSS 1.0 (RDF), con los ítems al lado del canal', () => {
    const xml = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel rdf:about="https://organismo.test/"><title>Organismo</title></channel>
  <item rdf:about="https://organismo.test/comunicado-1">
    <title>Comunicado de prensa</title>
    <link>https://organismo.test/comunicado-1</link>
    <description>Resumen del comunicado.</description>
    <dc:date>2026-10-02T12:00:00-03:00</dc:date>
  </item>
  <item rdf:about="https://organismo.test/comunicado-2">
    <title>Otro comunicado</title>
    <dc:date>2026-10-01T12:00:00-03:00</dc:date>
  </item>
</rdf:RDF>`;
    expect(parseFeed(xml)).toEqual([
      { url: 'https://organismo.test/comunicado-1', title: 'Comunicado de prensa', summary: 'Resumen del comunicado.', content: undefined, publishedAt: '2026-10-02T15:00:00.000Z' },
      // Sin <link>, la dirección sale de rdf:about.
      { url: 'https://organismo.test/comunicado-2', title: 'Otro comunicado', summary: '', content: undefined, publishedAt: '2026-10-01T15:00:00.000Z' },
    ]);
  });

  it('encuentra los feeds que declara o enlaza una portada', () => {
    const html = `<html><head>
      <link rel="alternate" type="application/rss+xml" title="Lo último" href="/rss/lo-ultimo.xml">
      <link type="application/atom+xml" rel="alternate home" href='https://diario.test/atom?seccion=1&amp;formato=xml'>
      <link rel="stylesheet" type="text/css" href="/estilos.css">
      <link rel="alternate" hreflang="en" href="/en/">
    </head><body>
      <a href="/rss">Canales RSS</a>
      <a href="https://diario.test/feeds/politica.xml">Política</a>
      <a href="/rss/lo-ultimo.xml">Repetido</a>
      <a href="/notas/la-crisis-del-transporte">Una nota</a>
      <a href="mailto:rss@diario.test">Contacto</a>
    </body></html>`;
    expect(feedLinks(html, 'https://diario.test/')).toEqual({
      declared: ['https://diario.test/rss/lo-ultimo.xml', 'https://diario.test/atom?seccion=1&formato=xml'],
      linked: ['https://diario.test/rss', 'https://diario.test/feeds/politica.xml'],
    });
    expect(COMMON_FEED_PATHS).toContain('/feed');
  });
});

describe('cifras de tiempo', () => {
  const figure = (text: string) => extractFigures(text, 'x')[0];

  it('una edad y una duración no se contradicen aunque hablen de la misma persona', () => {
    const age = figure('Murió el exjuez de la Corte Suprema Augusto Pérez a los 96 años.');
    const tenure = figure('El exjuez Augusto Pérez integró la Corte Suprema durante 22 años.');
    expect([age.unit, age.lead, tenure.unit, tenure.lead]).toEqual(['years', 'los', 'years', 'durante']);
    expect(sameSubject(age, tenure)).toBe(false);
  });

  it('dos edades distintas para la misma persona sí se contradicen', () => {
    const a = figure('Murió el exjuez Augusto Pérez a los 96 años.');
    const b = figure('El exjuez Augusto Pérez murió a los 86 años.');
    expect(sameSubject(a, b) && differs(a.value, b.value, 0.02)).toBe(true);
  });
});

describe('coberturas en vivo y páginas de servicio', () => {
  it('se descartan: no son un hecho para contrastar', () => {
    const skip = (title: string) => isRollingCoverage({ title });
    expect(skip('🔴 EN VIVO | Precio del dólar hoy, minuto a minuto')).toBe(true);
    expect(skip('La sesión en el Senado, en vivo')).toBe(true);
    expect(skip('Dólar blue hoy: a cuánto cotiza este viernes')).toBe(true);
    expect(skip('Cotización del euro: cuánto vale hoy')).toBe(true);
    expect(skip('Clima en Buenos Aires: el pronóstico del tiempo para este sábado')).toBe(true);
    expect(skip('Horóscopo de hoy para todos los signos')).toBe(true);
    expect(skip('Quiniela Nacional: resultados del sorteo de la mañana')).toBe(true);
  });

  it('una noticia que menciona esos temas no se descarta', () => {
    const skip = (title: string) => isRollingCoverage({ title });
    expect(skip('Por qué el dólar no baja aunque el Banco Central compra reservas')).toBe(false);
    expect(skip('El clima político en el Congreso se tensó antes de la sesión')).toBe(false);
    expect(skip('La cotización de la soja subió 3% en Chicago')).toBe(false);
    expect(skip('Habilitan el nuevo puente sobre el río Salado')).toBe(false);
  });
});

describe('robots.txt del proveedor de IA', () => {
  const longText = 'Texto completo de la nota con los hechos que el feed no trae en su resumen. '.repeat(4).trim();
  const routes: Record<string, () => Response> = {
    'https://andino.test/robots.txt': () => new Response('User-agent: Google-Extended\nDisallow: /\n\nUser-agent: *\nDisallow: /privado/\n'),
    'https://andino.test/nota': () => new Response(`<article><p>${longText}</p></article>`, { headers: { 'content-type': 'text/html' } }),
  };
  const fetcherWith = (alsoRespect: string[]) => {
    const requested: string[] = [];
    const fetcher = new WebArticleFetcher({
      alsoRespect,
      minIntervalMs: 0,
      fetchImpl: (async (input: string | URL | Request) => {
        requested.push(String(input));
        return routes[String(input)]?.() ?? new Response('', { status: 404 });
      }) as typeof fetch,
    });
    return { fetcher, requested };
  };

  it('con Gemini gratis, no lee la nota de un sitio que se lo prohíbe a Google-Extended', async () => {
    const { fetcher, requested } = fetcherWith([GEMINI_OPT_OUT_AGENT]);
    expect(await fetcher.permission(new URL('https://andino.test/nota'))).toBe('ai_optout');
    expect(await fetcher.permission(new URL('https://andino.test/privado/x'))).toBe('robots');
    expect(await fetcher.fetchText('https://andino.test/nota')).toBeNull();
    expect(fetcher.skipped).toEqual([{ url: 'https://andino.test/nota', reason: 'ai_optout' }]);
    expect(requested).toEqual(['https://andino.test/robots.txt']);
  });

  it('sin esa restricción, la lee', async () => {
    const { fetcher } = fetcherWith([]);
    expect(await fetcher.fetchText('https://andino.test/nota')).toBe(longText);
  });

  describe('redactor Gemini', () => {
    const previous = process.env.CONTRASTE_GEMINI_PLAN;
    afterEach(() => {
      if (previous === undefined) delete process.env.CONTRASTE_GEMINI_PLAN;
      else process.env.CONTRASTE_GEMINI_PLAN = previous;
    });
    const client = { models: { generateContent: async () => ({}) } };

    it('en el plan gratis respeta Google-Extended; en el pago, no hace falta', () => {
      delete process.env.CONTRASTE_GEMINI_PLAN;
      expect(new GeminiArticleWriter({ client }).optOutAgents).toEqual(['Google-Extended']);
      process.env.CONTRASTE_GEMINI_PLAN = 'pago';
      expect(new GeminiArticleWriter({ client }).optOutAgents).toEqual([]);
    });
  });
});

describe('tope de borradores por corrida', () => {
  const source = (id: string, name: string, kind: SourceDefinition['kind']): SourceDefinition => ({
    id,
    name,
    kind,
    origin: id,
    connector: 'rss',
    url: `https://${id}.test/feed.xml`,
    enabled: true,
  });
  const andino = source('andino', 'Diario Andino', 'local_media');
  const bosque = source('bosque', 'Diario del Bosque', 'local_media');
  const costa = source('costa', 'La Costa', 'local_media');
  const ministerio = source('ministerio', 'Ministerio de Salud', 'official');

  const entries: { def: SourceDefinition; slug: string; title: string; summary: string; content?: string }[] = [
    // Tres fuentes independientes.
    { def: andino, slug: 'puente', title: 'Habilitan el nuevo puente sobre el río Salado', summary: 'El puente une los dos barrios.' },
    { def: bosque, slug: 'puente', title: 'Quedó habilitado el puente sobre el río Salado', summary: 'Vecinos celebraron la apertura.' },
    { def: costa, slug: 'puente', title: 'Habilitaron el puente sobre el río Salado', summary: 'La obra demoró dos años.' },
    // Dos fuentes, sin fuente primaria.
    { def: andino, slug: 'puerto', title: 'El puerto licitará el dragado del canal de acceso', summary: 'La licitación se abrirá en marzo.' },
    { def: costa, slug: 'puerto', title: 'Licitación para el dragado del canal de acceso al puerto', summary: 'La convocatoria saldrá en marzo.' },
    // Dos fuentes, una oficial.
    { def: bosque, slug: 'hospital', title: 'Inauguran el hospital regional de Villa Norte', summary: 'Tendrá 120 camas.', content: 'TEXTO COMPLETO AJENO del feed.' },
    { def: ministerio, slug: 'hospital', title: 'Comunicado: inauguración del hospital regional de Villa Norte', summary: 'El ministerio informa la apertura.' },
    // Una sola fuente.
    { def: costa, slug: 'festival', title: 'Suspenden el festival de jazz de verano', summary: 'Los organizadores suspendieron la edición.' },
  ];
  const connectors: SourceConnector[] = [andino, bosque, costa, ministerio].map((def) => ({
    source: def,
    async fetchItems() {
      return entries
        .filter((e) => e.def === def)
        .map((e) => itemFromParts(e.def, { url: `https://${e.def.id}.test/${e.slug}`, title: e.title, summary: e.summary, content: e.content, publishedAt: NOW.toISOString() }, NOW));
    },
  }));

  const draftFor = (brief: ResearchBrief): DraftArticle => ({
    title: brief.headline,
    dek: 'Bajada de prueba.',
    type: 'noticia',
    category: 'sociedad',
    tags: ['prueba'],
    body: [{ type: 'p', text: 'Texto de prueba.' }],
    seoDescription: 'Descripción de prueba.',
    claims: [{ text: 'Afirmación de prueba.', sourceIds: [brief.sources[0].id], status: 'confirmed' }],
    writer: 'prueba',
  });

  async function run(writer: ArticleWriter, maxDrafts: number) {
    const read: string[] = [];
    const report = await runPipeline({
      connectors,
      writer,
      maxDrafts,
      fetcher: {
        async fetchText(url) {
          read.push(url);
          return null;
        },
      },
      now: () => NOW,
    });
    const stageOf = (word: string) => report.outcomes.find((o) => o.cluster.headline.toLowerCase().includes(word))?.stage;
    return { report, read, stageOf };
  }

  it('redacta primero lo que cubren más fuentes, después lo que tiene una fuente oficial, y deja el resto para la próxima', async () => {
    const written: string[] = [];
    const writer: ArticleWriter = {
      name: 'prueba',
      async write(brief) {
        written.push(brief.headline);
        return draftFor(brief);
      },
    };
    const { report, read, stageOf } = await run(writer, 2);

    expect(written).toHaveLength(2);
    expect(stageOf('puente')).toBe('drafted');
    expect(stageOf('hospital')).toBe('drafted');
    expect(stageOf('puerto')).toBe('deferred');
    expect(stageOf('festival')).toBe('verified');
    const puerto = report.outcomes.find((o) => o.stage === 'deferred')!;
    expect(puerto.review).toEqual({ decision: 'hold', reasons: ['La corrida llegó al máximo de 2 borradores: se redacta en una próxima.'] });
    // Lo que queda para la próxima no se lee.
    expect(read.some((url) => url.endsWith('/puerto'))).toBe(false);
    expect(read).toHaveLength(5);
  });

  it('si el redactor se queda sin cupo, no lo intenta con el resto de la corrida', async () => {
    let calls = 0;
    const writer: ArticleWriter = {
      name: 'prueba',
      async write() {
        calls++;
        throw new WriterError('Ningún modelo de Gemini pudo redactar el borrador (sin cupo).', true);
      },
    };
    const { report, stageOf } = await run(writer, 10);
    expect(calls).toBe(1);
    expect(stageOf('puente')).toBe('writer_failed');
    expect(stageOf('hospital')).toBe('deferred');
    expect(stageOf('puerto')).toBe('deferred');
    expect(report.outcomes.find((o) => o.stage === 'deferred')!.review.reasons[0]).toMatch(/sin cupo o saturado/);
  });

  it('si la corrida llega a su tiempo máximo, lo que falta queda para la próxima', async () => {
    let minutes = 0;
    const written: string[] = [];
    const writer: ArticleWriter = {
      name: 'prueba',
      async write(brief) {
        written.push(brief.headline);
        minutes += 3;
        return draftFor(brief);
      },
    };
    const report = await runPipeline({
      connectors,
      writer,
      maxDrafts: 10,
      maxPerCategory: 10,
      maxRunMinutes: 4,
      now: () => new Date(NOW.getTime() + minutes * 60_000),
    });

    // Empieza el primero a los 0 minutos y el segundo a los 3; el tercero ya no.
    expect(written).toHaveLength(2);
    const deferred = report.outcomes.filter((o) => o.stage === 'deferred');
    expect(deferred).toHaveLength(1);
    expect(deferred[0].review.reasons).toEqual(['La corrida llegó a su tiempo máximo (4 minutos): se redacta en la próxima.']);
  });

  it('el registro deja títulos y direcciones aparte del mensaje, para que el registro público los oculte', async () => {
    const calls: [string, string | undefined][] = [];
    const writer: ArticleWriter = { name: 'prueba', write: async (brief) => draftFor(brief) };
    const report = await runPipeline({
      connectors,
      writer,
      maxDrafts: 10,
      maxPerCategory: 10,
      fetcher: { fetchText: async () => 'Texto completo de la nota, con los hechos que el feed no trae en su resumen.' },
      publisher: { save: async (article) => `base de datos (${article.review.status})` },
      log: (message, detail) => calls.push([message, detail]),
      now: () => NOW,
    });

    const headlines = report.outcomes.map((o) => o.cluster.headline);
    for (const [message] of calls) {
      expect(message).not.toMatch(/https?:\/\//);
      for (const h of headlines) expect(message).not.toContain(h);
    }
    expect(calls.some(([m, d]) => m.startsWith('texto completo de') && headlines.includes(d ?? ''))).toBe(true);
    expect(calls.filter(([m]) => m.startsWith('guardada')).every(([m, d]) => m === 'guardada → base de datos (in_review)' && Boolean(d))).toBe(true);
  });

  it('no llena una corrida con una sola sección', async () => {
    // Otro hecho de sociedad, como el puente (el clasificador lo asigna por "barrio" y "vecinos").
    const cortes = [
      { def: andino, slug: 'cortes', title: 'Vecinos del barrio sur reclaman por los cortes de luz', summary: 'Llevan tres días sin servicio.' },
      { def: bosque, slug: 'cortes', title: 'Cortes de luz: reclamo de vecinos del barrio sur', summary: 'Los vecinos cortaron una avenida.' },
    ];
    const withCortes: SourceConnector[] = connectors.map((c) => ({
      source: c.source,
      async fetchItems(options) {
        const extra = cortes
          .filter((e) => e.def === c.source)
          .map((e) => itemFromParts(e.def, { url: `https://${e.def.id}.test/${e.slug}`, title: e.title, summary: e.summary, publishedAt: NOW.toISOString() }, NOW));
        return [...(await c.fetchItems(options)), ...extra];
      },
    }));
    const writer: ArticleWriter = { name: 'prueba', write: async (brief) => draftFor(brief) };
    const report = await runPipeline({ connectors: withCortes, writer, maxDrafts: 10, maxPerCategory: 1, now: () => NOW });
    const outcome = (word: string) => report.outcomes.find((o) => o.cluster.headline.toLowerCase().includes(word))!;
    // El puente (3 fuentes) va primero; los cortes, de la misma sección, quedan para la próxima.
    expect(outcome('puente').stage).toBe('drafted');
    expect(outcome('cortes').stage).toBe('deferred');
    expect(outcome('cortes').review.reasons).toEqual(['Ya hay 1 borrador de sociedad en esta corrida: se redacta en una próxima.']);
    // Las otras secciones no se ven afectadas.
    expect(outcome('hospital').stage).toBe('drafted');
    expect(outcome('dragado').stage).toBe('drafted');
  });

  it('a igual cobertura, redacta primero lo confirmado que lo que todas las fuentes dan en condicional', async () => {
    const rumor = [
      { def: andino, slug: 'rumor', title: 'El club habría contratado a un nuevo director técnico', summary: 'Trascendió que firmaría por dos años.' },
      { def: costa, slug: 'rumor', title: 'El club habría contratado a su nuevo director técnico', summary: 'Según trascendió, el acuerdo se firmaría hoy.' },
    ];
    const withRumor: SourceConnector[] = connectors.map((c) => ({
      source: c.source,
      async fetchItems(options) {
        const extra = rumor
          .filter((e) => e.def === c.source)
          .map((e) => itemFromParts(e.def, { url: `https://${e.def.id}.test/${e.slug}`, title: e.title, summary: e.summary, publishedAt: NOW.toISOString() }, NOW));
        return [...(await c.fetchItems(options)), ...extra];
      },
    }));
    const written: string[] = [];
    const writer: ArticleWriter = {
      name: 'prueba',
      async write(brief) {
        written.push(brief.headline);
        return draftFor(brief);
      },
    };
    const report = await runPipeline({ connectors: withRumor, writer, maxDrafts: 3, maxPerCategory: 10, now: () => NOW });
    const rumorOutcome = report.outcomes.find((o) => o.cluster.headline.includes('director técnico'))!;
    expect(rumorOutcome.verification.status).toBe('partial');
    // Puente (3 fuentes), hospital (2, con una oficial), puerto (2): el rumor (2, en condicional) queda para después.
    expect(written).toHaveLength(3);
    expect(rumorOutcome.stage).toBe('deferred');
  });

  it('el informe que se guarda en la base es compacto y ningún informe lleva texto ajeno', async () => {
    const writer: ArticleWriter = { name: 'prueba', write: async (brief) => draftFor(brief) };
    const { report } = await run(writer, 2);
    expect(JSON.stringify(report)).toContain('TEXTO COMPLETO AJENO');

    const local = JSON.stringify(withoutFeedText(report));
    expect(local).not.toContain('TEXTO COMPLETO AJENO');
    expect(local).toContain('Vecinos celebraron la apertura.');

    const stored = compactReport(report);
    expect(stored.stages).toEqual({ verified: 1, drafted: 2, deferred: 1 });
    expect(stored.singleSource).toBe(1);
    expect(stored.deferred).toEqual([{ headline: 'Licitación para el dragado del canal de acceso al puerto', independentSources: 2 }]);
    expect(stored.researched.map((r) => r.stage)).toEqual(['drafted', 'drafted']);
    expect(Object.keys(stored.researched[0].sources[0]).sort()).toEqual(['publishedAt', 'sourceId', 'title', 'url']);
    expect(stored.researched[0].draft).toEqual({ title: stored.researched[0].headline, writer: 'prueba' });
    const json = JSON.stringify(stored);
    expect(json).not.toContain('TEXTO COMPLETO AJENO');
    expect(json).not.toContain('Vecinos celebraron la apertura.');
  });
});

describe('memoria entre corridas', () => {
  const source = (id: string, kind: SourceDefinition['kind'] = 'local_media'): SourceDefinition => ({
    id,
    name: `Diario ${id}`,
    kind,
    origin: id,
    connector: 'rss',
    url: `https://${id}.test/feed.xml`,
    enabled: true,
  });
  const andino = source('andino');
  const bosque = source('bosque');
  const at = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString();
  const item = (def: SourceDefinition, slug: string, title: string, publishedAt: string, extra: { content?: string } = {}) =>
    itemFromParts(def, { url: `https://${def.id}.test/${slug}`, title, summary: `Resumen de ${slug}.`, publishedAt, ...extra }, NOW);
  const connector = (def: SourceDefinition, items: ReturnType<typeof item>[]): SourceConnector => ({ source: def, fetchItems: async () => items });

  it('cruza un hecho con lo que un medio publicó horas antes y su feed ya no muestra', async () => {
    // A la mañana lo publicó el Andino; a la tarde, el Bosque. El feed del Andino ya no lo muestra.
    const morning = item(andino, 'puente', 'Habilitan el nuevo puente sobre el río Salado', at(9));
    const afternoon = item(bosque, 'puente', 'Quedó habilitado el puente sobre el río Salado', at(1));
    const connectors = [connector(andino, []), connector(bosque, [afternoon])];

    const without = await runPipeline({ connectors, now: () => NOW });
    expect(without.outcomes.map((o) => o.verification.independentSources)).toEqual([1]);

    const removed = source('cerrado');
    const previous = [
      // La configuración del Andino cambió desde entonces: vale la actual.
      { ...morning, sourceName: 'Nombre viejo', origin: 'origen-viejo' },
      // De una fuente que ya no está configurada, o fuera de la ventana, no se usa.
      item(removed, 'puente', 'Habilitado el puente sobre el río Salado', at(2)),
      item(andino, 'viejo', 'Habilitan el puente sobre el río Salado, otra vez', at(30)),
    ];
    const report = await runPipeline({ connectors, previousItems: previous, now: () => NOW });
    expect(report.collected).toBe(2);
    const [puente] = report.outcomes;
    expect(puente.verification.independentSources).toBe(2);
    expect(puente.cluster.items.find((i) => i.sourceId === 'andino')).toMatchObject({ sourceName: 'Diario andino', origin: 'andino' });
  });

  it('guarda los ítems de la ventana sin el texto de las notas y los recupera', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'contraste-memoria-'));
    try {
      const file = path.join(dir, 'pipeline', 'memoria.json');
      expect(await loadMemory(file)).toEqual({ items: [] });

      const fresh = item(andino, 'puente', 'Habilitan el nuevo puente sobre el río Salado', at(2), { content: 'TEXTO COMPLETO AJENO' });
      const old = item(bosque, 'viejo', 'Una nota de anteayer', at(40));
      const report = await runPipeline({ connectors: [connector(andino, [fresh]), connector(bosque, [])], previousItems: [old], sinceHours: 48, now: () => NOW });
      const remembered = itemsToRemember(report, new Date(NOW.getTime() - 24 * 3_600_000));
      expect(remembered.map((i) => i.id)).toEqual([fresh.id]);

      await saveMemory(file, remembered, NOW);
      expect(await readFile(file, 'utf8')).not.toContain('TEXTO COMPLETO AJENO');
      const loaded = await loadMemory(file);
      expect(loaded.items).toEqual([{ ...fresh, content: undefined }].map((i) => JSON.parse(JSON.stringify(i))));

      // Un archivo dañado o de otro formato no frena la corrida: se empieza de cero.
      await writeFile(file, '{ roto', 'utf8');
      expect((await loadMemory(file)).warning).toMatch(/dañada/);
      await writeFile(file, JSON.stringify({ version: 99, items: [] }), 'utf8');
      expect((await loadMemory(file)).warning).toMatch(/otro formato/);
      await writeFile(file, JSON.stringify({ version: 1, items: [{ id: 'incompleto' }, JSON.parse(JSON.stringify(fresh))] }), 'utf8');
      expect((await loadMemory(file)).items.map((i) => i.id)).toEqual([fresh.id]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('no recuerda ítems de prueba', async () => {
    const demo = demoSources.find((d) => d.id === 'fixture-diario')!;
    const report = await runPipeline({ connectors: [connector(demo, [item(demo, 'x', 'Una nota de prueba', at(1))])], now: () => NOW });
    expect(itemsToRemember(report, new Date(0))).toEqual([]);
  });
});
