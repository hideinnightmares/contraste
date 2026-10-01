/**
 * Ítems de prueba (ficticios) para ejercitar cada camino del pipeline:
 *
 * 1. "Puente": tres orígenes independientes que coinciden → se puede verificar.
 * 2. "Puerto": dos medios dan cifras distintas para lo mismo → contradicción, revisión humana.
 * 3. "Festival": una sola fuente → no se puede publicar como hecho.
 * 4. "Puente" (réplica): un portal replica el cable de la agencia → no suma independencia.
 * 5. Un ítem de agregador → solo detecta el tema, no cuenta como fuente.
 */
export interface FixtureEntry {
  sourceId: string;
  url: string;
  title: string;
  summary: string;
  content?: string;
  minutesAgo: number;
}

export const demoFeed: FixtureEntry[] = [
  // 1. Hecho verificable
  {
    sourceId: 'fixture-agencia',
    url: 'https://example.com/prueba/agencia/puente-habilitado?utm_source=rss',
    title: 'Habilitan el nuevo puente sobre el río Salado tras dos años de obra',
    summary:
      'El organismo de vialidad habilitó el puente de 420 metros que une las dos márgenes del río Salado. La obra demandó dos años y permitirá el paso de camiones de hasta 45 toneladas.',
    minutesAgo: 90,
  },
  {
    sourceId: 'fixture-replica',
    url: 'https://example.com/prueba/replica/puente-salado',
    title: 'Habilitan el nuevo puente sobre el río Salado tras dos años de obra',
    summary:
      'El organismo de vialidad habilitó el puente de 420 metros que une las dos márgenes del río Salado. La obra demandó dos años y permitirá el paso de camiones de hasta 45 toneladas.',
    minutesAgo: 80,
  },
  {
    sourceId: 'fixture-diario',
    url: 'https://example.com/prueba/diario/puente-salado-inauguracion',
    title: 'Quedó habilitado el puente sobre el río Salado',
    summary:
      'El nuevo puente, de 420 metros, ya está habilitado al tránsito. Vecinos de ambas márgenes celebraron la apertura después de dos años de obra.',
    minutesAgo: 70,
  },
  {
    sourceId: 'fixture-organismo',
    url: 'https://example.com/prueba/organismo/comunicado-puente-salado',
    title: 'Comunicado: habilitación del puente sobre el río Salado',
    summary:
      'Vialidad informa la habilitación del puente sobre el río Salado, con una longitud de 420 metros y capacidad para vehículos de carga de hasta 45 toneladas.',
    minutesAgo: 100,
  },
  {
    sourceId: 'fixture-agregador',
    url: 'https://example.com/prueba/agregador/puente-salado',
    title: 'Puente sobre el río Salado: ya está habilitado',
    summary: 'Resumen automático de varias fuentes.',
    minutesAgo: 60,
  },

  // 2. Contradicción en una cifra
  {
    sourceId: 'fixture-agencia',
    url: 'https://example.com/prueba/agencia/puerto-dragado',
    title: 'El puerto licitará el dragado del canal de acceso',
    summary:
      'La administración portuaria anunció que licitará el dragado del canal de acceso por 120 millones de dólares, con un plazo de obra de 18 meses.',
    minutesAgo: 200,
  },
  {
    sourceId: 'fixture-internacional',
    url: 'https://example.com/prueba/internacional/puerto-licitacion-dragado',
    title: 'Licitación para el dragado del canal de acceso al puerto',
    summary:
      'El puerto convocará a una licitación para el dragado del canal de acceso por 150 millones de dólares, según fuentes de la administración portuaria. El plazo de obra sería de 18 meses.',
    minutesAgo: 180,
  },

  // 3. Fuente única
  {
    sourceId: 'fixture-diario',
    url: 'https://example.com/prueba/diario/festival-cancelado',
    title: 'Suspenden el festival de jazz de verano por falta de sponsors',
    summary: 'Los organizadores del festival de jazz de verano habrían decidido suspender la edición de este año.',
    minutesAgo: 150,
  },
];
