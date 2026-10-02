import type { KnownOutlet, SourceDefinition } from '@/pipeline/types';

/**
 * Fuentes del pipeline.
 *
 * No hay fuentes reales habilitadas: conectar un medio requiere revisar sus
 * condiciones de uso (o tener un acuerdo) y cargar la URL de su feed oficial.
 * Para agregar una:
 *   1. Sumá un objeto con `connector: 'rss'`, la URL del feed y `enabled: true`.
 *   2. Asigná `origin`: dos fuentes que publican el mismo cable comparten origen.
 *   3. Si otros medios la citan con otro nombre ("NA", "diario Clarín"), sumalo en `aliases`.
 *      Así, una nota que dice "según informó Clarín" cuenta como Clarín y no como fuente nueva.
 *   4. Si es un agregador (por ejemplo, un feed de búsqueda de noticias), marcá
 *      `discoveryOnly: true`: sirve para detectar temas, nunca como fuente.
 *
 * Las fuentes `fixture` leen ítems de prueba de `src/pipeline/fixtures/` y existen
 * para la demostración y los tests. No se publican como noticias reales.
 */
export const sourceDefinitions: SourceDefinition[] = [
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
  // Ejemplo de fuente real (deshabilitada hasta tener URL y permiso):
  // {
  //   id: 'organismo-ejemplo',
  //   name: 'Nombre del organismo',
  //   kind: 'official',
  //   origin: 'organismo-ejemplo',
  //   connector: 'rss',
  //   url: 'https://…/feed.xml',
  //   enabled: false,
  // },
];

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
