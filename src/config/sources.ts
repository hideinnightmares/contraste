import type { KnownOutlet, SourceDefinition } from '@/pipeline/types';

/**
 * Fuentes del pipeline. Ver docs/AUTOMATIZACION.md, "Fuentes".
 *
 * El pipeline lee el feed de cada fuente para detectar hechos y contrastarlos entre medios.
 * No reproduce su texto: el redactor escribe una nota propia y cita de dónde sale cada dato.
 *
 * Para agregar una fuente:
 *   1. Sumá un objeto con `connector: 'rss'`, la URL del feed, la portada (`site`) y `enabled: true`.
 *   2. Asigná `origin`: dos fuentes que publican el mismo cable comparten origen.
 *   3. Si otros medios la citan con otro nombre ("NA", "LA NACION"), sumalo en `aliases`, con sus
 *      mayúsculas. Así, una nota que dice "según informó Clarín" cuenta como Clarín y no como
 *      fuente nueva. Los acentos no hacen falta: "Clarin" ya coincide con "Clarín".
 *   4. Si es un agregador (por ejemplo, un feed de búsqueda de noticias), marcá
 *      `discoveryOnly: true`: sirve para detectar temas, nunca como fuente.
 *   5. Probala con `npm run fuentes:probar` (o en GitHub, Actions > Probar las fuentes).
 */
export const realSources: SourceDefinition[] = [
  // Medios nacionales.
  {
    id: 'clarin',
    name: 'Clarín',
    kind: 'local_media',
    origin: 'clarin',
    connector: 'rss',
    url: 'https://www.clarin.com/rss/lo-ultimo/',
    site: 'https://www.clarin.com/',
    enabled: true,
  },
  {
    id: 'la-nacion',
    name: 'La Nación',
    kind: 'local_media',
    origin: 'la-nacion',
    connector: 'rss',
    url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml',
    site: 'https://www.lanacion.com.ar/',
    aliases: ['LA NACION'],
    enabled: true,
  },
  {
    id: 'infobae',
    name: 'Infobae',
    kind: 'local_media',
    origin: 'infobae',
    connector: 'rss',
    url: 'https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml',
    site: 'https://www.infobae.com/',
    enabled: true,
  },
  {
    id: 'pagina12',
    name: 'Página/12',
    kind: 'local_media',
    origin: 'pagina12',
    connector: 'rss',
    url: 'https://www.pagina12.com.ar/arc/outboundfeeds/rss/?outputType=xml',
    site: 'https://www.pagina12.com.ar/',
    aliases: ['Página 12', 'Página12'],
    enabled: true,
  },
  {
    id: 'perfil',
    name: 'Perfil',
    kind: 'local_media',
    origin: 'perfil',
    connector: 'rss',
    url: 'https://www.perfil.com/feed',
    site: 'https://www.perfil.com/',
    enabled: true,
  },
  {
    id: 'eldiarioar',
    name: 'elDiarioAR',
    kind: 'local_media',
    origin: 'eldiarioar',
    connector: 'rss',
    url: 'https://www.eldiarioar.com/rss/',
    site: 'https://www.eldiarioar.com/',
    aliases: ['elDiario.ar'],
    enabled: true,
  },
  {
    id: 'ambito',
    name: 'Ámbito',
    kind: 'local_media',
    origin: 'ambito',
    connector: 'rss',
    url: 'https://www.ambito.com/rss/pages/home.xml',
    site: 'https://www.ambito.com/',
    aliases: ['Ámbito Financiero'],
    enabled: true,
  },
  {
    id: 'el-cronista',
    name: 'El Cronista',
    kind: 'local_media',
    origin: 'el-cronista',
    connector: 'rss',
    url: 'https://www.cronista.com/arc/outboundfeeds/rss/?outputType=xml',
    site: 'https://www.cronista.com/',
    aliases: ['Cronista'],
    enabled: true,
  },

  // Agencia. Comparte origen con la entrada de `wireAgencies`: un medio que publica un cable de
  // NA cuenta como NA.
  {
    id: 'noticias-argentinas',
    name: 'Noticias Argentinas',
    kind: 'news_agency',
    origin: 'agencia:noticias-argentinas',
    connector: 'rss',
    url: 'https://noticiasargentinas.com/rss',
    site: 'https://noticiasargentinas.com/',
    aliases: ['NA'],
    enabled: true,
  },

  // Fuentes oficiales: el redactor apoya la nota en ellas y las nombra primero. El Boletín
  // Oficial, el INDEC y el BCRA no publican feeds (probado el 2 de octubre de 2026): quedan
  // deshabilitados, con la dirección de su página de novedades, hasta tener un conector que la lea.
  {
    id: 'gobierno-nacional',
    name: 'Gobierno nacional',
    kind: 'official',
    origin: 'gobierno-nacional',
    connector: 'rss',
    url: 'https://www.argentina.gob.ar/rss.xml',
    site: 'https://www.argentina.gob.ar/',
    enabled: true,
  },
  {
    id: 'boletin-oficial',
    name: 'Boletín Oficial',
    kind: 'public_document',
    origin: 'boletin-oficial',
    connector: 'rss',
    url: 'https://www.boletinoficial.gob.ar/seccion/primera',
    site: 'https://www.boletinoficial.gob.ar/',
    enabled: false,
  },
  {
    id: 'indec',
    name: 'INDEC',
    kind: 'official',
    origin: 'indec',
    connector: 'rss',
    url: 'https://www.indec.gob.ar/indec/web/Institucional-Indec-InformesTecnicos',
    site: 'https://www.indec.gob.ar/',
    enabled: false,
  },
  {
    id: 'bcra',
    name: 'Banco Central (BCRA)',
    kind: 'official',
    origin: 'bcra',
    connector: 'rss',
    url: 'https://www.bcra.gob.ar/buscador-de-comunicaciones/',
    site: 'https://www.bcra.gob.ar/',
    enabled: false,
  },

  // Internacionales en castellano.
  {
    id: 'bbc-mundo',
    name: 'BBC Mundo',
    kind: 'international_media',
    origin: 'bbc',
    connector: 'rss',
    url: 'https://feeds.bbci.co.uk/mundo/rss.xml',
    site: 'https://www.bbc.com/mundo',
    aliases: ['BBC', 'BBC News Mundo'],
    enabled: true,
  },
  {
    id: 'dw',
    name: 'DW',
    kind: 'international_media',
    origin: 'dw',
    connector: 'rss',
    url: 'https://rss.dw.com/xml/rss-sp-all',
    site: 'https://www.dw.com/es/',
    aliases: ['Deutsche Welle'],
    enabled: true,
  },
  {
    id: 'noticias-onu',
    name: 'Noticias ONU',
    kind: 'official',
    origin: 'onu',
    connector: 'rss',
    url: 'https://news.un.org/feed/subscribe/es/news/all/rss.xml',
    site: 'https://news.un.org/es/',
    enabled: true,
  },
];

/**
 * Fuentes de prueba: leen los ítems ficticios de `src/pipeline/fixtures/` y existen para la
 * demostración (`npm run pipeline -- --prueba`) y los tests. No se publican como noticias reales.
 */
export const demoSources: SourceDefinition[] = [
  {
    id: 'fixture-agencia',
    name: 'Agencia nacional de noticias (prueba)',
    kind: 'news_agency',
    origin: 'agencia-nacional',
    connector: 'fixture',
    url: 'fixture://demo-feed',
    enabled: true,
  },
  {
    id: 'fixture-replica',
    name: 'Portal que replica la agencia (prueba)',
    kind: 'local_media',
    origin: 'agencia-nacional',
    connector: 'fixture',
    url: 'fixture://demo-feed',
    enabled: true,
  },
  {
    id: 'fixture-diario',
    name: 'Diario regional (prueba)',
    kind: 'local_media',
    origin: 'diario-regional',
    connector: 'fixture',
    url: 'fixture://demo-feed',
    enabled: true,
  },
  {
    id: 'fixture-internacional',
    name: 'Diario internacional (prueba)',
    kind: 'international_media',
    origin: 'diario-internacional',
    connector: 'fixture',
    url: 'fixture://demo-feed',
    enabled: true,
  },
  {
    id: 'fixture-organismo',
    name: 'Organismo oficial (prueba)',
    kind: 'official',
    origin: 'organismo',
    connector: 'fixture',
    url: 'fixture://demo-feed',
    enabled: true,
  },
  {
    id: 'fixture-agregador',
    name: 'Agregador de noticias (prueba)',
    kind: 'aggregator',
    origin: 'agregador',
    connector: 'fixture',
    url: 'fixture://demo-feed',
    enabled: true,
    discoveryOnly: true,
  },
];

/** Todas las fuentes configuradas, reales y de prueba. */
export const sourceDefinitions: SourceDefinition[] = [...realSources, ...demoSources];

/**
 * Agencias de noticias que los medios suelen reproducir. Una nota firmada por una agencia
 * ("(EFE)", "Fuente: NA") o que le atribuye la información ("según informó AFP") cuenta como esa
 * agencia, no como una fuente independiente. Si una de estas agencias se configura como fuente
 * arriba, vale esa configuración (con sus `aliases`) y la de acá se ignora.
 */
export const wireAgencies: KnownOutlet[] = [
  { name: 'Noticias Argentinas', origin: 'agencia:noticias-argentinas', aliases: ['Noticias Argentinas', 'NA'] },
  { name: 'EFE', origin: 'agencia:efe', aliases: ['EFE'] },
  { name: 'AFP', origin: 'agencia:afp', aliases: ['AFP', 'France-Presse', 'France Presse'] },
  { name: 'Reuters', origin: 'agencia:reuters', aliases: ['Reuters'] },
  { name: 'Associated Press', origin: 'agencia:ap', aliases: ['Associated Press', 'AP'] },
  { name: 'ANSA', origin: 'agencia:ansa', aliases: ['ANSA'] },
  { name: 'DPA', origin: 'agencia:dpa', aliases: ['DPA'] },
  { name: 'Europa Press', origin: 'agencia:europa-press', aliases: ['Europa Press'] },
  { name: 'Xinhua', origin: 'agencia:xinhua', aliases: ['Xinhua'] },
  { name: 'Bloomberg', origin: 'agencia:bloomberg', aliases: ['Bloomberg'] },
];
