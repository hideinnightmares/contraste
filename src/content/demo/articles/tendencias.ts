import type { DemoSpec } from '../builder';

export const tendencias: DemoSpec[] = [
  {
    slug: 'bicicleta-para-ir-a-trabajar',
    title: 'Por qué cada vez más personas eligen la bicicleta para ir a trabajar',
    dek: 'Los conteos en ciclovías muestran más viajes en horario laboral. Las razones: costo, tiempo y, en menor medida, salud. El obstáculo sigue siendo dónde dejarla.',
    category: 'tendencias',
    tags: ['Bicicleta', 'Movilidad', 'Ciudades'],
    image: 'bicicleta',
    minutesAgo: 780,
    priority: 3,
    status: 'verified',
    sources: [
      ['organismo', 'Conteos automáticos en ciclovías.'],
      ['universidad', 'Encuesta de movilidad urbana.'],
      ['radio-local', 'Testimonios de ciclistas.'],
    ],
    claims: [
      { text: 'Los conteos registran más viajes en bicicleta en horario laboral.', status: 'confirmed', sources: ['organismo', 'universidad'] },
    ],
    body: [
      { type: 'p', text: 'Los contadores automáticos instalados en las ciclovías registran cada año más viajes en las franjas de entrada y salida del trabajo. Una encuesta de movilidad de una universidad pública ayuda a entender por qué.' },
      { type: 'p', text: 'Entre quienes usan la bicicleta para trabajar, el motivo más mencionado es el costo, seguido por el tiempo de viaje en distancias cortas. La salud aparece en tercer lugar. La principal razón para no usarla, entre quienes no lo hacen, es la falta de lugares seguros donde dejarla.' },
      { type: 'p', text: 'Los ciclistas consultados agregaron otro pedido: continuidad en la red, porque muchas ciclovías terminan sin conectar con otras.' },
    ],
  },
  {
    slug: 'huertas-en-balcones-cultivo-urbano',
    title: 'Huertas en balcones: el cultivo urbano gana espacio en los departamentos',
    dek: 'Talleres llenos, viveros con secciones nuevas y consultas sobre qué se puede plantar en dos metros cuadrados.',
    category: 'tendencias',
    tags: ['Huertas', 'Ciudades', 'Hábitos'],
    image: 'balcones',
    minutesAgo: 1920,
    priority: 2,
    status: 'verified',
    sources: [
      ['organismo', 'Datos de los talleres municipales de huerta.'],
      ['diario-regional', 'Relevamiento en viveros.'],
    ],
    body: [
      { type: 'p', text: 'Los talleres municipales de huerta urbana completaron sus cupos en todas las sedes, y los viveros consultados abrieron secciones dedicadas a cultivos para macetas: aromáticas, hojas verdes y tomates de variedades compactas.' },
      { type: 'p', text: 'Quienes dictan los talleres señalan que la consulta más frecuente es qué se puede cultivar con poca luz. La respuesta habitual: aromáticas y hojas verdes, que necesitan menos horas de sol que los frutos.' },
    ],
  },
  {
    slug: 'vuelta-del-vinilo-disquerias',
    title: 'La vuelta del vinilo sostiene a las disquerías independientes',
    dek: 'Las ventas de discos físicos son una fracción de la música que se escucha, pero para las disquerías alcanzan. Los precios son el límite.',
    category: 'tendencias',
    tags: ['Música', 'Consumo cultural', 'Hábitos'],
    image: 'tocadiscos',
    minutesAgo: 2640,
    priority: 2,
    status: 'verified',
    sources: [
      ['camara-sector', 'Datos de ventas de discos físicos.'],
      ['radio-local', 'Entrevistas a dueños de disquerías.'],
    ],
    body: [
      { type: 'p', text: 'La venta de discos de vinilo sigue creciendo, aunque representa una porción mínima de la música que se escucha, casi toda por plataformas digitales. Para las disquerías independientes, sin embargo, esa porción es suficiente para sostener el negocio.' },
      { type: 'p', text: 'Los dueños consultados describen dos públicos: coleccionistas que buscan ediciones especiales y jóvenes que compran el disco de un artista que ya escuchan en el teléfono. El límite es el precio, que depende de importaciones.' },
    ],
  },
];
