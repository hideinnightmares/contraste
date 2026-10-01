import type { SourceDefinition } from '@/pipeline/types';

/**
 * Fuentes del pipeline.
 *
 * No hay fuentes reales habilitadas: conectar un medio requiere revisar sus
 * condiciones de uso (o tener un acuerdo) y cargar la URL de su feed oficial.
 * Para agregar una:
 *   1. Sumá un objeto con `connector: 'rss'`, la URL del feed y `enabled: true`.
 *   2. Asigná `origin`: dos fuentes que publican el mismo cable comparten origen.
 *   3. Si es un agregador (por ejemplo, un feed de búsqueda de noticias), marcá
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
