import type { DemoSpec } from '../builder';

export const negocios: DemoSpec[] = [
  {
    slug: 'pymes-exportadoras-servicios-conocimiento',
    title: 'Más pymes exportan servicios de software y diseño, aunque la mayoría factura poco',
    dek: 'El registro de exportadores de servicios sumó empresas en el año. Nueve de cada diez venden al exterior menos de lo que facturan en el país.',
    category: 'negocios',
    tags: ['Pymes', 'Exportaciones', 'Economía del conocimiento'],
    minutesAgo: 660,
    priority: 3,
    status: 'verified',
    sources: [
      ['organismo', 'Registro de exportadores de servicios.'],
      ['camara-sector', 'Encuesta a empresas del sector.'],
      ['diario-regional', 'Casos de empresas exportadoras.'],
    ],
    claims: [
      { text: 'El registro de exportadores de servicios sumó empresas en el año.', status: 'confirmed', sources: ['organismo', 'camara-sector'] },
    ],
    body: [
      { type: 'p', text: 'El registro de exportadores de servicios basados en conocimiento sumó empresas en lo que va del año, según los datos del organismo que lo administra. La mayoría son pymes de software, diseño y servicios profesionales.' },
      { type: 'p', text: 'La encuesta de la cámara del sector agrega un matiz: nueve de cada diez de esas empresas venden al exterior menos de lo que facturan en el mercado interno. Exportar, para la mayoría, es todavía un complemento.' },
      { type: 'p', text: 'Las empresas consultadas mencionaron como obstáculos los costos de cobrar desde el exterior y la dificultad para contratar perfiles con experiencia, que compiten con las ofertas de empresas extranjeras.' },
    ],
  },
  {
    slug: 'comercio-electronico-crece-ciudades-medianas',
    title: 'El comercio electrónico crece más rápido en las ciudades medianas que en las grandes',
    dek: 'La mejora en la logística de última milla acercó los plazos de entrega. Los comercios locales empiezan a vender también por internet.',
    category: 'negocios',
    tags: ['Comercio electrónico', 'Logística', 'Ciudades'],
    image: 'escritorio',
    minutesAgo: 1200,
    priority: 2,
    status: 'verified',
    sources: [
      ['camara-sector', 'Estudio anual de comercio electrónico.'],
      ['diario-regional', 'Casos de comercios locales.'],
    ],
    body: [
      { type: 'p', text: 'Las compras por internet crecieron más en las ciudades de entre cien mil y quinientos mil habitantes que en los grandes centros urbanos, según el estudio anual de la cámara de comercio electrónico. El informe atribuye el cambio a la mejora en los tiempos de entrega fuera de las grandes ciudades.' },
      { type: 'p', text: 'Ese crecimiento no solo beneficia a las grandes plataformas: comercios locales de esas ciudades empezaron a vender por sus propios canales, con entregas en el día dentro del ejido urbano.' },
    ],
  },
  {
    slug: 'cafeterias-especialidad-negocio-expansion',
    title: 'Cafeterías de especialidad: un negocio que se expande, con márgenes cada vez más ajustados',
    dek: 'Abren locales en barrios que hace cinco años no tenían ninguno. Los dueños dicen que el costo del grano importado define si sobreviven.',
    category: 'negocios',
    tags: ['Gastronomía', 'Emprendimientos', 'Consumo'],
    image: 'cafe',
    minutesAgo: 900,
    priority: 2,
    status: 'verified',
    sources: [
      ['camara-sector', 'Relevamiento de aperturas de locales.'],
      ['diario-regional', 'Entrevistas a dueños de cafeterías.'],
    ],
    body: [
      { type: 'p', text: 'Las cafeterías de especialidad siguen abriendo locales, ahora en barrios residenciales alejados de los centros comerciales, según un relevamiento de la cámara gastronómica. El crecimiento convive con márgenes cada vez más ajustados.' },
      { type: 'p', text: 'Los dueños consultados coincidieron en que el principal costo es el grano, que se importa, y que su precio define si un local se sostiene. Varios empezaron a tostar su propio café para reducir intermediarios.' },
    ],
  },
];
