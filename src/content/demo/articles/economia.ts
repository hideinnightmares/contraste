import type { DemoSpec } from '../builder';

export const economia: DemoSpec[] = [
  {
    slug: 'precios-canasta-basica-relevamiento-septiembre',
    title: 'Los precios de la canasta básica se mantuvieron estables en septiembre, según un relevamiento de consumidores',
    dek: 'La medición, hecha en 120 comercios de barrio y cadenas, encontró subas en lácteos y bajas en verduras de estación. No reemplaza al índice oficial, que se publica a mediados de mes.',
    category: 'economia',
    tags: ['Precios', 'Consumo', 'Canasta básica'],
    image: 'supermercado',
    minutesAgo: 130,
    priority: 4,
    status: 'verified',
    sources: [
      ['asociacion-consumidores', 'Relevamiento de precios y metodología.'],
      ['diario-regional', 'Precios en comercios de barrio.'],
      ['camara-sector', 'Datos de ventas de las cadenas.'],
    ],
    claims: [
      { text: 'El relevamiento cubre 40 productos en 120 comercios.', status: 'confirmed', sources: ['asociacion-consumidores'] },
      { text: 'Los lácteos subieron y las verduras de estación bajaron respecto de agosto.', status: 'confirmed', sources: ['asociacion-consumidores', 'diario-regional'] },
    ],
    body: [
      { type: 'p', text: 'El precio promedio de una canasta de 40 productos básicos se mantuvo prácticamente sin cambios en septiembre respecto de agosto, según un relevamiento de una asociación de consumidores hecho en 120 comercios, entre almacenes de barrio y sucursales de cadenas.' },
      { type: 'p', text: 'Dentro de ese promedio hubo movimientos opuestos: los lácteos registraron las subas más marcadas, mientras que las verduras de estación bajaron. Los precios de los productos de limpieza y almacén seco casi no variaron.' },
      { type: 'note', tone: 'context', title: 'Qué mide y qué no', text: 'Es un relevamiento privado con una canasta propia. No reemplaza al índice de precios oficial, que mide una canasta más amplia con otra metodología y se publica a mediados de cada mes.' },
      { type: 'p', text: 'Los comercios de barrio consultados por el diario regional coincidieron en que las ventas siguen por debajo del año pasado, y que los clientes compran en menor cantidad y con más frecuencia. La cámara que agrupa a las cadenas reportó una tendencia similar en sus datos de ventas.' },
    ],
  },
  {
    slug: 'cuotas-sin-interes-que-se-sabe',
    title: 'Cuotas sin interés: qué se sabe del nuevo esquema y qué falta definir',
    dek: 'El programa vuelve con otro plazo y otros rubros. Ordenamos lo confirmado por la norma y lo que todavía depende de los bancos.',
    category: 'economia',
    type: 'explicador',
    tags: ['Cuotas', 'Consumo', 'Tarjetas de crédito'],
    image: 'pago',
    minutesAgo: 540,
    priority: 3,
    status: 'partial',
    sources: [
      ['boletin-oficial', 'Texto de la resolución.'],
      ['organismo', 'Preguntas frecuentes publicadas por el organismo.'],
      ['camara-sector', 'Posición de los comercios adheridos.'],
    ],
    claims: [
      { text: 'El programa incluye electrodomésticos, indumentaria y materiales de construcción.', status: 'confirmed', sources: ['boletin-oficial', 'organismo'] },
      { text: 'Todos los bancos van a adherir.', status: 'unconfirmed', sources: ['camara-sector'] },
    ],
    body: [
      { type: 'p', text: 'El programa de cuotas sin interés vuelve con cambios en los plazos y en los rubros incluidos. Esto es lo que dice la resolución publicada y lo que todavía no está claro.' },
      {
        type: 'facts',
        confirmed: [
          'Rige desde el primer día hábil del mes próximo.',
          'Incluye electrodomésticos, indumentaria, calzado y materiales de construcción.',
          'Los comercios adheridos deben exhibir el precio de contado y el precio total en cuotas.',
        ],
        unconfirmed: [
          'Qué bancos van a ofrecerlo: la adhesión es voluntaria y no hay una lista oficial.',
          'Si habrá un tope de monto por compra.',
        ],
      },
      { type: 'h2', text: 'Qué conviene revisar antes de comprar' },
      { type: 'list', items: ['Que el precio en cuotas sea igual al de contado: si es mayor, hay interés aunque no se lo llame así.', 'El costo financiero total que figura en el ticket.', 'Si tu banco adhiere, en su sitio oficial o en el resumen de la tarjeta.'] },
    ],
  },
  {
    slug: 'productores-region-nucleo-siembra-lluvias',
    title: 'Productores de la región núcleo esperan una buena siembra, pero advierten por la falta de lluvias',
    dek: 'Los informes técnicos coinciden en que la humedad de los suelos mejoró en el sur, pero sigue escasa en el norte. Las estimaciones de área sembrada difieren entre entidades.',
    category: 'economia',
    tags: ['Campo', 'Cosecha', 'Clima'],
    image: 'cosecha',
    minutesAgo: 720,
    priority: 3,
    status: 'partial',
    sources: [
      ['informe-tecnico', 'Estado de humedad de los suelos por zona.'],
      ['camara-sector', 'Estimación de intención de siembra.'],
      ['diario-regional', 'Testimonios de productores sobre los costos.'],
    ],
    claims: [
      { text: 'La humedad de los suelos mejoró en el sur de la región y sigue escasa en el norte.', status: 'confirmed', sources: ['informe-tecnico', 'diario-regional'] },
      { text: 'El área sembrada crecerá respecto de la campaña anterior.', status: 'unconfirmed', sources: ['camara-sector'] },
    ],
    body: [
      { type: 'p', text: 'Las lluvias de las últimas semanas mejoraron la humedad de los suelos en el sur de la región núcleo, pero en el norte las reservas siguen por debajo de lo necesario para sembrar con tranquilidad, según el último informe técnico de seguimiento de cultivos.' },
      { type: 'p', text: 'La intención de siembra es alta: una cámara del sector estima que el área sembrada crecerá respecto de la campaña anterior. Esa proyección todavía no fue confirmada por otras entidades y depende de que llueva en octubre.' },
      { type: 'p', text: 'Los productores consultados por el diario regional mencionaron además la suba de costos de los insumos como un factor que puede frenar las decisiones de siembra en los campos alquilados.' },
    ],
  },
  {
    slug: 'dolar-cierre-estable-bajo-volumen',
    title: 'El dólar cerró estable en una rueda de bajo volumen',
    dek: 'Las cotizaciones casi no se movieron en una jornada con pocas operaciones.',
    category: 'economia',
    type: 'breve',
    tags: ['Dólar', 'Mercados'],
    minutesAgo: 25,
    priority: 2,
    status: 'verified',
    sources: [
      ['agencia-nacional', 'Cierre de la jornada cambiaria.'],
      ['diario-regional', 'Cotizaciones en casas de cambio.'],
    ],
    body: [
      { type: 'p', text: 'Las cotizaciones del dólar cerraron prácticamente sin cambios en una rueda con poco volumen de operaciones. Los operadores consultados atribuyeron la calma a la espera de datos de la semana próxima.' },
    ],
  },
];
