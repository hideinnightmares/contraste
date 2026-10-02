import { describe, expect, it } from 'vitest';
import { wireAgencies } from '@/config/sources';
import { runPipeline } from '@/pipeline/run';
import { WebArticleFetcher, extractArticle, truncateText } from '@/pipeline/sources/article';
import { itemFromParts, stripHtml, type SourceConnector } from '@/pipeline/sources/connector';
import { userAgent } from '@/pipeline/sources/http';
import { isAllowed, parseRobots } from '@/pipeline/sources/robots';
import { citedOutlet, knownOutlets } from '@/pipeline/stages/attribution';
import { checkGrounding } from '@/pipeline/stages/grounding';
import { clusterItems } from '@/pipeline/stages/dedupe';
import { verifyCluster } from '@/pipeline/stages/verify';
import { WRITER_SYSTEM_PROMPT, type ArticleWriter } from '@/pipeline/writers/writer';
import type { DraftArticle, ResearchBrief, SourceDefinition } from '@/pipeline/types';

/**
 * Lectura del texto completo de las notas, robots.txt y conteo de fuentes cuando una nota
 * repite a otra. Todo con sitios y medios ficticios: nada sale a internet.
 */

const NOW = new Date('2026-10-02T15:00:00Z');

const source = (id: string, name: string, kind: SourceDefinition['kind'], extra: Partial<SourceDefinition> = {}): SourceDefinition => ({
  id,
  name,
  kind,
  origin: id,
  connector: 'rss',
  url: `https://${id}.test/feed.xml`,
  enabled: true,
  ...extra,
});

const andino = source('andino', 'Diario Andino', 'local_media');
const bosque = source('bosque', 'Diario del Bosque', 'local_media', { aliases: ['El Bosque'] });
const costa = source('costa', 'La Costa', 'local_media');
const ministerio = source('ministerio', 'Ministerio de Obras', 'official');

const item = (def: SourceDefinition, slug: string, title: string, summary: string) =>
  itemFromParts(def, { url: `https://${def.id}.test/${slug}`, title, summary, publishedAt: NOW.toISOString() }, NOW);

describe('robots.txt', () => {
  const robots = parseRobots(`
# Comentario
Disallow: /antes-de-todo
User-agent: *
Disallow: /privado/
Allow: /privado/abierto
Disallow: /*.pdf$
Sitemap: https://diario.test/sitemap.xml

User-agent: OtroBot
User-agent: ContrasteBot
Disallow: /archivo/
Disallow:
`);

  it('usa el grupo de nuestro robot si existe y si no, el de *', () => {
    // Para ContrasteBot vale solo su grupo: /privado/ no le aplica.
    expect(isAllowed(robots, 'ContrasteBot', '/privado/nota')).toBe(true);
    expect(isAllowed(robots, 'contrastebot', '/archivo/2020')).toBe(false);
    expect(isAllowed(robots, 'TercerBot', '/privado/nota')).toBe(false);
    expect(isAllowed(robots, 'TercerBot', '/archivo/2020')).toBe(true);
  });

  it('gana la regla más específica; comodines y fin de dirección', () => {
    expect(isAllowed(robots, 'TercerBot', '/privado/abierto/nota')).toBe(true);
    expect(isAllowed(robots, 'TercerBot', '/docs/informe.pdf')).toBe(false);
    expect(isAllowed(robots, 'TercerBot', '/docs/informe.pdf?v=2')).toBe(true);
    // Una regla antes de cualquier User-agent no pertenece a ningún grupo.
    expect(isAllowed(robots, 'TercerBot', '/antes-de-todo')).toBe(true);
    expect(isAllowed(robots, 'TercerBot', '/robots.txt')).toBe(true);
  });

  it('ante un empate entre Allow y Disallow, permite', () => {
    const tie = parseRobots('User-agent: *\nDisallow: /nota\nAllow: /nota\n');
    expect(isAllowed(tie, 'ContrasteBot', '/nota/1')).toBe(true);
    expect(isAllowed(parseRobots(''), 'ContrasteBot', '/lo-que-sea')).toBe(true);
  });
});

describe('extracción del texto de una nota', () => {
  const body = 'El municipio habilitó el nuevo puente sobre el río Salado, que une los dos barrios de la ribera. '.repeat(4);

  it('prefiere el cuerpo declarado en los datos estructurados, también dentro de @graph', () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'WebPage' }, { '@type': 'NewsArticle', articleBody: body, isAccessibleForFree: true }],
    })}</script></head><body><article><p>Otro texto que no es el cuerpo declarado y no debería usarse en este caso.</p></article></body></html>`;
    expect(extractArticle(html)).toEqual({ text: body.trim(), paywalled: false, noAi: false });
  });

  it('no usa notas detrás de un muro de pago ni las que piden no ser usadas por IA', () => {
    const paid = `<script type="application/ld+json">{"@type":"NewsArticle","isAccessibleForFree":"False","articleBody":"${body}"}</script>`;
    expect(extractArticle(paid)).toMatchObject({ text: null, paywalled: true });
    const part = `<script type="application/ld+json">{"@type":["Article"],"hasPart":[{"@type":"WebPageElement","isAccessibleForFree":false}],"articleBody":"${body}"}</script>`;
    expect(extractArticle(part).paywalled).toBe(true);
    const noAi = `<head><meta content="noindex, noai" name="robots"></head><article><p>${body}</p></article>`;
    expect(extractArticle(noAi)).toMatchObject({ text: null, noAi: true });
  });

  it('sin datos estructurados, toma los párrafos del <article> con más texto y descarta lo que no es la nota', () => {
    const html = `
      <article><p>Relacionada: otra nota que no corresponde a este hecho puntual.</p></article>
      <article>
        <p>El intendente inaugur&oacute; el puente el lunes por la ma&#241;ana, con presencia de vecinos de ambas orillas.</p>
        <figure><p>Epígrafe de la foto que no forma parte del texto de la nota.</p></figure>
        <aside><p>Leé también: una nota recomendada que no tiene que entrar en el texto.</p></aside>
        <script>var publicidad = "<p>no es texto</p>";</script>
        <p>La obra demandó dos años y permite el paso de camiones de hasta 45 toneladas, según detalló el municipio local en un comunicado.</p>
        <p>Corto.</p>
      </article>`;
    const { text } = extractArticle(html);
    expect(text).toBe(
      'El intendente inauguró el puente el lunes por la mañana, con presencia de vecinos de ambas orillas.\nLa obra demandó dos años y permite el paso de camiones de hasta 45 toneladas, según detalló el municipio local en un comunicado.',
    );
    expect(extractArticle('<p>Muy poco texto.</p>').text).toBeNull();
  });

  it('decodifica entidades y recorta en un fin de párrafo', () => {
    expect(stripHtml('Inflaci&oacute;n de &#x31;0&nbsp;% &amp;lt;')).toBe('Inflación de 10 % &lt;');
    expect(truncateText('Primer párrafo completo.\nSegundo párrafo que no entra.', 40)).toBe('Primer párrafo completo.');
  });
});

describe('lector de notas', () => {
  const page = (text: string, type = 'text/html; charset=utf-8') =>
    new Response(`<html><body><article><p>${text}</p></article></body></html>`, { headers: { 'content-type': type } });
  const longText = 'Texto completo de la nota con los hechos que el feed no trae en su resumen. '.repeat(4).trim();

  function setup(routes: Record<string, () => Response>) {
    const calls: { url: string; userAgent: string }[] = [];
    const waits: number[] = [];
    let clock = 0;
    const fetcher = new WebArticleFetcher({
      fetchImpl: (async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        calls.push({ url, userAgent: new Headers(init?.headers).get('user-agent') ?? '' });
        return routes[url]?.() ?? new Response('', { status: 404 });
      }) as typeof fetch,
      minIntervalMs: 2_000,
      now: () => clock,
      sleep: async (ms) => {
        waits.push(ms);
        clock += ms;
      },
    });
    return { fetcher, calls, waits };
  }

  it('lee el texto, se presenta como ContrasteBot y espera entre pedidos al mismo sitio', async () => {
    const { fetcher, calls, waits } = setup({
      'https://andino.test/robots.txt': () => new Response('User-agent: *\nDisallow: /privado/\n'),
      'https://andino.test/nota-1': () => page(longText),
      'https://andino.test/nota-2': () => page(longText),
    });
    expect(await fetcher.fetchText('https://andino.test/nota-1')).toBe(longText);
    expect(await fetcher.fetchText('https://andino.test/nota-2')).toBe(longText);
    // robots.txt una sola vez por sitio; dos segundos entre pedidos al mismo sitio.
    expect(calls.map((c) => c.url)).toEqual(['https://andino.test/robots.txt', 'https://andino.test/nota-1', 'https://andino.test/nota-2']);
    expect(waits).toEqual([2_000, 2_000]);
    expect(calls.every((c) => c.userAgent === userAgent() && c.userAgent.startsWith('ContrasteBot/'))).toBe(true);
  });

  it('respeta robots.txt, los errores del sitio y los muros de pago', async () => {
    const paid = `<script type="application/ld+json">{"@type":"NewsArticle","isAccessibleForFree":false,"articleBody":"${longText}"}</script>`;
    const { fetcher, calls } = setup({
      'https://andino.test/robots.txt': () => new Response('User-agent: ContrasteBot\nDisallow: /\n'),
      'https://bosque.test/robots.txt': () => new Response('error', { status: 503 }),
      'https://costa.test/nota-paga': () => new Response(paid, { headers: { 'content-type': 'text/html' } }),
      'https://costa.test/informe.pdf': () => new Response('%PDF', { headers: { 'content-type': 'application/pdf' } }),
    });
    expect(await fetcher.fetchText('https://andino.test/nota')).toBeNull();
    expect(await fetcher.fetchText('https://bosque.test/nota')).toBeNull();
    // Sin robots.txt (404) se puede leer, pero esta nota es paga.
    expect(await fetcher.fetchText('https://costa.test/nota-paga')).toBeNull();
    expect(await fetcher.fetchText('https://costa.test/informe.pdf')).toBeNull();
    expect(fetcher.skipped.map((s) => s.reason)).toEqual(['robots', 'robots', 'paywall', 'not_html']);
    // Las notas prohibidas por robots.txt ni siquiera se piden.
    expect(calls.map((c) => c.url)).not.toContain('https://andino.test/nota');
    expect(calls.map((c) => c.url)).not.toContain('https://bosque.test/nota');
  });

  it('descarta el texto si una redirección lleva a una dirección prohibida', async () => {
    const redirected = page(longText);
    Object.defineProperty(redirected, 'url', { value: 'https://andino.test/privado/nota' });
    const { fetcher } = setup({
      'https://andino.test/robots.txt': () => new Response('User-agent: *\nDisallow: /privado/\n'),
      'https://andino.test/nota': () => redirected,
    });
    expect(await fetcher.fetchText('https://andino.test/nota')).toBeNull();
    expect(fetcher.skipped).toEqual([{ url: 'https://andino.test/nota', reason: 'robots' }]);
  });
});

describe('una nota que repite a otro medio no suma independencia', () => {
  const outlets = knownOutlets([andino, bosque, costa, ministerio]);

  it('reconoce atribuciones y firmas de agencia, con mayúsculas y sin acentos', () => {
    expect(citedOutlet('El puente se habilitó, según informó el Diario del Bosque.', outlets, 'andino')?.origin).toBe('bosque');
    expect(citedOutlet('Lo publicó El Bosque esta mañana.', outlets, 'andino')?.origin).toBe('bosque');
    expect(citedOutlet('El Bosque cambió de director.', outlets, 'andino')).toBeNull();
    expect(citedOutlet('Lo confirmó El Bosque esta mañana.', outlets, 'andino')?.origin).toBe('bosque');
    expect(citedOutlet('RÍO SALADO (EFE).- El puente quedó habilitado.', outlets, 'andino')?.origin).toBe('agencia:efe');
    expect(citedOutlet('Fuente: NA', outlets, 'andino')?.origin).toBe('agencia:noticias-argentinas');
    expect(citedOutlet('Según la agencia de noticias Reuters, el puerto cerrará.', outlets, 'andino')?.origin).toBe('agencia:reuters');
    // "la Nación" con minúscula es el Estado; "La Costa" con mayúscula, el diario.
    expect(citedOutlet('Los fondos, según la costa atlántica, llegarán en marzo.', outlets, 'andino')).toBeNull();
    expect(citedOutlet('Según La Costa, los fondos llegarán en marzo.', outlets, 'andino')?.origin).toBe('costa');
    // Ni una foto de agencia, ni el propio medio, ni un organismo oficial cuentan.
    expect(citedOutlet('El puente habilitado. (Foto: AFP)', outlets, 'andino')).toBeNull();
    expect(citedOutlet('Según informó el Diario Andino en su edición impresa.', outlets, 'andino')).toBeNull();
    expect(citedOutlet('Según informó el Ministerio de Obras, la obra terminó.', outlets, 'andino')).toBeNull();
  });

  it('una agencia configurada como fuente reemplaza a la de la lista conocida', () => {
    const na = source('na', 'Agencia NA', 'news_agency', { origin: 'na-propia', aliases: ['Noticias Argentinas', 'NA'] });
    const list = knownOutlets([na], wireAgencies);
    expect(list.filter((o) => o.aliases.includes('NA')).map((o) => o.origin)).toEqual(['na-propia']);
  });

  it('el verificador cuenta como una sola fuente a los medios que repiten a otro o a la misma agencia', () => {
    const own = item(andino, 'puente', 'Habilitan el nuevo puente sobre el río Salado', 'El puente une los dos barrios de la ribera.');
    const other = item(bosque, 'puente', 'Quedó habilitado el puente sobre el río Salado', 'Vecinos de ambas márgenes celebraron la apertura.');
    const cluster = clusterItems([own, other])[0];
    expect(cluster.items).toHaveLength(2);
    expect(verifyCluster(cluster, { outlets }).independentSources).toBe(2);

    const quoting = verifyCluster(cluster, { outlets, fullTexts: new Map([[own.id, 'Según informó el Diario del Bosque, el puente quedó habilitado.']]) });
    expect(quoting.independentSources).toBe(1);
    expect(quoting.status).toBe('unverified');
    expect(quoting.reasons).toContain('"Diario Andino" atribuye la información a Diario del Bosque: cuenta como esa fuente.');

    const wire = verifyCluster(cluster, {
      outlets,
      fullTexts: new Map([
        [own.id, 'RÍO SALADO (AFP).- El puente quedó habilitado.'],
        [other.id, 'El puente quedó habilitado, informó AFP.'],
      ]),
    });
    expect(wire.origins).toEqual(['agencia:afp']);
  });
});

describe('pipeline con lectura del texto completo', () => {
  const feed: Record<string, { def: SourceDefinition; slug: string; title: string; summary: string }[]> = {
    puente: [
      { def: andino, slug: 'puente', title: 'Habilitan el nuevo puente sobre el río Salado', summary: 'El puente une los dos barrios de la ribera.' },
      { def: bosque, slug: 'puente', title: 'Quedó habilitado el puente sobre el río Salado', summary: 'Vecinos celebraron la apertura.' },
      { def: ministerio, slug: 'puente', title: 'Comunicado: habilitación del puente sobre el río Salado', summary: 'El ministerio informa la habilitación.' },
    ],
    puerto: [
      { def: andino, slug: 'puerto', title: 'El puerto licitará el dragado del canal de acceso', summary: 'La licitación se abrirá en marzo.' },
      { def: costa, slug: 'puerto', title: 'Licitación para el dragado del canal de acceso al puerto', summary: 'La convocatoria saldrá en marzo.' },
    ],
    festival: [{ def: costa, slug: 'festival', title: 'Suspenden el festival de jazz de verano', summary: 'Los organizadores suspendieron la edición.' }],
  };
  const connectors: SourceConnector[] = [andino, bosque, costa, ministerio].map((def) => ({
    source: def,
    async fetchItems() {
      return Object.values(feed)
        .flat()
        .filter((e) => e.def === def)
        .map((e) => item(e.def, e.slug, e.title, e.summary));
    },
  }));

  it('lee las notas solo de lo verificable, vuelve a verificar y le pasa el texto al redactor', async () => {
    const full: Record<string, string> = {
      'https://andino.test/puente': 'Texto completo del Diario Andino: el puente mide 420 metros y lo inauguró el intendente.',
      'https://bosque.test/puente': 'Texto completo del Diario del Bosque sobre la habilitación del puente.',
      'https://ministerio.test/puente': 'Comunicado completo del ministerio con los datos técnicos de la obra.',
      // Los dos medios del puerto repiten el mismo cable: no hay dos fuentes independientes.
      'https://andino.test/puerto': 'BUENOS AIRES (NA).- El puerto licitará el dragado.',
      'https://costa.test/puerto': 'El puerto licitará el dragado del canal, informó la agencia NA.',
    };
    const read: string[] = [];
    const briefs: ResearchBrief[] = [];
    const writer: ArticleWriter = {
      name: 'prueba',
      async write(brief) {
        briefs.push(brief);
        return draftFor(brief);
      },
    };
    const report = await runPipeline({
      connectors,
      writer,
      fetcher: {
        async fetchText(url) {
          read.push(url);
          return full[url] ?? null;
        },
      },
      now: () => NOW,
    });

    // El festival tiene una sola fuente: queda en espera sin leer su nota.
    expect(read).not.toContain('https://costa.test/festival');
    expect(read).toHaveLength(5);

    const puerto = report.outcomes.find((o) => o.cluster.headline.includes('puerto'))!;
    expect(puerto.verification.status).toBe('unverified');
    expect(puerto.verification.origins).toEqual(['agencia:noticias-argentinas']);
    expect(puerto.draft).toBeNull();

    // Solo el puente llega al redactor, con el texto completo de cada fuente.
    expect(briefs).toHaveLength(1);
    const andinoText = briefs[0].sources.find((s) => s.name === 'Diario Andino')!.text;
    expect(andinoText).toContain('el puente mide 420 metros');
  });
});

describe('redactor', () => {
  it('atribuye en el texto, prioriza lo oficial y los nombres de las fuentes no cuentan como inventados', () => {
    expect(WRITER_SYSTEM_PROMPT).toContain('Atribuí en el texto cada dato a la fuente que lo aporta');
    expect(WRITER_SYSTEM_PROMPT).toContain('basá la nota en ellas');

    const brief: ResearchBrief = {
      clusterId: 'c',
      headline: 'Habilitan el puente',
      category: 'sociedad',
      sources: [
        { id: 'voz:1', name: 'La Voz del Interior', kind: 'local_media', url: 'https://voz.test/1', publishedAt: NOW.toISOString(), text: 'El puente quedó habilitado.', isDemo: false },
      ],
      verification: verifyCluster({ id: 'c', items: [], headline: '', firstSeenAt: '', lastSeenAt: '' }),
    };
    const draft = draftFor(brief, 'El puente quedó habilitado, según informó La Voz del Interior.');
    expect(checkGrounding(draft, brief).ungroundedNames).toEqual([]);
  });
});

function draftFor(brief: ResearchBrief, text = 'El puente quedó habilitado.'): DraftArticle {
  return {
    title: 'Habilitan el puente sobre el río Salado',
    dek: 'La obra une los dos barrios de la ribera.',
    type: 'noticia',
    category: 'sociedad',
    tags: ['Obras públicas'],
    body: [{ type: 'p', text }],
    seoDescription: 'Quedó habilitado el puente.',
    claims: [{ text: 'El puente quedó habilitado.', sourceIds: [brief.sources[0].id], status: 'confirmed' }],
    writer: 'prueba',
  };
}
