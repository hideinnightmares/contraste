import type { DemoSpec } from '../builder';

export const cultura: DemoSpec[] = [
  {
    slug: 'salas-cine-barrio-reabren-estrenos-nacionales',
    title: 'Las salas de cine de barrio que reabrieron suman estrenos nacionales a su cartelera',
    dek: 'Doce salas recuperadas por cooperativas y municipios acordaron programar películas nacionales en su semana de estreno. Las distribuidoras celebran el acuerdo; los exhibidores grandes, no tanto.',
    category: 'cultura',
    tags: ['Cine', 'Cultura', 'Barrios'],
    image: 'cine',
    minutesAgo: 600,
    priority: 3,
    status: 'verified',
    sources: [
      ['organismo', 'Convenio de programación firmado con las salas.'],
      ['diario-regional', 'Situación de las salas reabiertas.'],
      ['camara-sector', 'Posición de los exhibidores.'],
    ],
    claims: [
      { text: 'Doce salas firmaron el convenio de programación.', status: 'confirmed', sources: ['organismo', 'diario-regional'] },
    ],
    body: [
      { type: 'p', text: 'Doce salas de cine de barrio que reabrieron en los últimos años, gestionadas por cooperativas o municipios, firmaron un convenio para programar películas nacionales en su semana de estreno. Hasta ahora, la mayoría de esos títulos llegaba a estas salas meses después, cuando ya habían salido de los circuitos comerciales.' },
      { type: 'p', text: 'El convenio fija al menos una función diaria de cine nacional durante la primera semana y precios de entrada diferenciados para estudiantes y jubilados. Las distribuidoras independientes valoraron el acuerdo porque amplía las pantallas disponibles para películas de bajo presupuesto.' },
      { type: 'p', text: 'La cámara de exhibidores advirtió que el convenio podría generar una competencia desigual si las salas reciben subsidios que las cadenas no tienen. El organismo respondió que el acuerdo no incluye aportes económicos.' },
    ],
  },
  {
    slug: 'festivales-musica-independiente-cambian-entradas',
    title: 'Los festivales de música independiente cambian su modelo de entradas para frenar la reventa',
    dek: 'Entradas nominales, devoluciones dentro de la misma plataforma y precios por tramos. Los organizadores dicen que funciona; la reventa se mudó a otras redes.',
    category: 'cultura',
    tags: ['Música', 'Festivales', 'Consumo'],
    image: 'concierto',
    minutesAgo: 1080,
    priority: 3,
    status: 'verified',
    sources: [
      ['camara-sector', 'Datos de los organizadores sobre ventas y reventa.'],
      ['asociacion-consumidores', 'Reclamos recibidos por entradas.'],
      ['radio-local', 'Cobertura de la temporada de festivales.'],
    ],
    body: [
      { type: 'p', text: 'Un grupo de festivales de música independiente adoptó para esta temporada un modelo de entradas nominales: cada entrada lleva el nombre de quien la compra y solo puede transferirse dentro de la plataforma oficial, al precio original.' },
      { type: 'p', text: 'Los organizadores reportaron menos reclamos por entradas falsas. La asociación de consumidores consultada confirmó una baja en las denuncias, aunque advirtió que la reventa no desapareció: se trasladó a grupos en redes sociales, donde se ofrecen transferencias por fuera del sistema.' },
      { type: 'p', text: 'Algunos festivales sumaron además precios por tramos, con entradas más baratas para quienes compran con anticipación, una práctica que también genera críticas porque los últimos tramos pueden costar el doble.' },
    ],
  },
  {
    slug: 'muestra-cien-anos-fotografia-documental',
    title: 'Una muestra reúne cien años de fotografía documental hecha en el país',
    dek: 'Doscientas imágenes, muchas inéditas, de archivos públicos y colecciones familiares. La exposición se puede recorrer gratis hasta marzo.',
    category: 'cultura',
    tags: ['Fotografía', 'Muestras', 'Archivos'],
    image: 'muestra',
    minutesAgo: 2040,
    priority: 2,
    status: 'verified',
    sources: [
      ['organismo', 'Catálogo y fechas de la muestra.'],
      ['diario-regional', 'Recorrido por la exposición.'],
    ],
    body: [
      { type: 'p', text: 'Una muestra en un museo público reúne doscientas fotografías documentales tomadas en el país a lo largo de un siglo, desde registros de obras públicas de comienzos del siglo XX hasta trabajos recientes sobre migraciones internas.' },
      { type: 'p', text: 'Muchas de las imágenes no habían sido exhibidas: provienen de archivos provinciales y de colecciones familiares que se digitalizaron para la ocasión. Cada foto está acompañada por su contexto de producción, cuando se conoce, y por una nota cuando el autor no pudo ser identificado.' },
      { type: 'p', text: 'La entrada es gratuita y la muestra puede recorrerse hasta marzo. El catálogo digital estará disponible en el sitio del museo.' },
    ],
  },
];
