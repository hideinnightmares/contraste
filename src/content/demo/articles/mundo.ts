import type { DemoSpec } from '../builder';

export const mundo: DemoSpec[] = [
  {
    slug: 'cumbre-climatica-fondo-adaptacion-paises-sur',
    title: 'Países del sur proponen un fondo común de adaptación climática con reglas de acceso compartidas',
    dek: 'La propuesta se presentó en la reunión preparatoria de la cumbre climática. Las fuentes coinciden en el planteo, pero difieren sobre el monto inicial que se discutió.',
    category: 'mundo',
    tags: ['Cambio climático', 'Diplomacia', 'Financiamiento'],
    image: 'cumbre',
    minutesAgo: 190,
    priority: 4,
    status: 'disputed',
    sources: [
      ['agencia-internacional', 'Cobertura de la sesión y del documento presentado.'],
      ['diario-internacional', 'Información de delegaciones sobre el monto.'],
      ['organismo', 'Comunicado de la secretaría de la conferencia.'],
      ['agregador', 'Usado solo para detectar la noticia; no cuenta como fuente.'],
    ],
    claims: [
      { text: 'Un grupo de países presentó una propuesta de fondo común de adaptación.', status: 'confirmed', sources: ['agencia-internacional', 'diario-internacional', 'organismo'] },
      { text: 'El monto inicial propuesto para el fondo.', status: 'disputed', sources: ['agencia-internacional', 'diario-internacional'] },
    ],
    contradictions: [
      {
        topic: 'Monto inicial del fondo',
        detail: 'La agencia internacional informó una cifra de 10.000 millones de dólares; el diario internacional, citando a dos delegaciones, informó 15.000 millones. El comunicado oficial no menciona montos.',
        sources: ['agencia-internacional', 'diario-internacional'],
      },
    ],
    body: [
      { type: 'p', text: 'Un grupo de países del sur global presentó en la reunión preparatoria de la cumbre climática una propuesta para crear un fondo común de adaptación, con reglas de acceso compartidas y prioridad para obras de infraestructura frente a inundaciones y sequías.' },
      { type: 'p', text: 'Según el comunicado de la secretaría de la conferencia, la propuesta será discutida en las mesas técnicas de las próximas semanas. El documento plantea que los fondos se asignen por proyectos y no por país, y que la evaluación quede a cargo de un comité con representación regional.' },
      { type: 'note', tone: 'disputed', title: 'Las fuentes no coinciden en el monto', text: 'Una agencia internacional informó que la propuesta parte de 10.000 millones de dólares; un diario internacional, citando a dos delegaciones, habló de 15.000 millones. El comunicado oficial no menciona cifras. Hasta que el documento se publique, no damos por cierto ninguno de los dos montos.' },
      { type: 'h2', text: 'Por qué importa' },
      { type: 'p', text: 'Los mecanismos de financiamiento climático existentes reciben críticas por la demora entre la aprobación de un proyecto y la llegada del dinero. La propuesta busca acortar ese plazo con reglas comunes, aunque no detalla quién aportaría los fondos.' },
    ],
  },
  {
    slug: 'atlantico-sur-trafico-maritimo-desvios',
    title: 'El tráfico de buques de carga por el Atlántico Sur crece por los desvíos de otras rutas',
    dek: 'Los puertos de la región registran más escalas de buques que evitan rutas congestionadas. Los operadores advierten que la infraestructura no creció al mismo ritmo.',
    category: 'mundo',
    tags: ['Comercio exterior', 'Puertos', 'Rutas marítimas'],
    image: 'puerto',
    minutesAgo: 960,
    priority: 3,
    status: 'verified',
    sources: [
      ['informe-tecnico', 'Estadísticas de escalas portuarias del trimestre.'],
      ['agencia-internacional', 'Contexto sobre los desvíos de rutas.'],
      ['camara-sector', 'Posición de los operadores portuarios.'],
    ],
    claims: [
      { text: 'Las escalas de buques portacontenedores aumentaron en el trimestre.', status: 'confirmed', sources: ['informe-tecnico', 'agencia-internacional'] },
    ],
    body: [
      { type: 'p', text: 'Los puertos del Atlántico Sur registraron en el último trimestre más escalas de buques portacontenedores que en el mismo período del año anterior, según un informe técnico de estadísticas portuarias. Parte del aumento se explica por navieras que evitan rutas congestionadas en otras regiones.' },
      { type: 'p', text: 'Los operadores portuarios señalaron que el crecimiento expone limitaciones de infraestructura, como el calado de los canales de acceso y la cantidad de grúas disponibles, que provocan esperas en los momentos de mayor demanda.' },
      { type: 'p', text: 'El informe advierte que la tendencia podría revertirse si las rutas habituales se normalizan, por lo que no recomienda proyectarla a largo plazo.' },
    ],
  },
  {
    slug: 'por-que-acuerdos-comerciales-tardan-anos',
    title: 'Por qué los acuerdos comerciales entre bloques tardan años en firmarse',
    dek: 'No es solo burocracia: cada capítulo toca intereses distintos dentro de cada país, y un acuerdo se cierra cuando el último de ellos está resuelto.',
    category: 'mundo',
    type: 'analisis',
    tags: ['Comercio exterior', 'Diplomacia'],
    minutesAgo: 1560,
    priority: 2,
    status: 'verified',
    sources: [
      ['universidad', 'Investigación sobre negociaciones comerciales.'],
      ['diario-internacional', 'Cobertura de negociaciones recientes.'],
    ],
    body: [
      { type: 'note', tone: 'context', title: 'Este texto es un análisis', text: 'Interpreta procesos documentados en las fuentes citadas. Las conclusiones son de la redacción.' },
      { type: 'p', text: 'Un acuerdo comercial entre bloques no es un documento sino decenas: aranceles, reglas de origen, compras públicas, propiedad intelectual, normas sanitarias. Cada capítulo tiene ganadores y perdedores dentro de cada país, y cada uno puede trabar el conjunto.' },
      { type: 'p', text: 'A eso se suma la ratificación. Aun después de la firma, los parlamentos de cada miembro tienen que aprobarlo, y un cambio de gobierno en cualquiera de ellos puede reabrir capítulos que parecían cerrados.' },
      { type: 'p', text: 'Por eso, cuando un acuerdo se anuncia como inminente, conviene preguntar qué capítulos siguen abiertos y quién tiene que ratificarlo. La respuesta suele explicar el calendario mejor que cualquier declaración.' },
    ],
  },
  {
    slug: 'reabre-paso-fronterizo-cargas',
    title: 'Reabre un paso fronterizo de cargas tras dos semanas de bloqueo',
    dek: 'Los camiones vuelven a circular con controles reforzados.',
    category: 'mundo',
    type: 'breve',
    tags: ['Comercio exterior', 'Transporte'],
    minutesAgo: 140,
    priority: 2,
    status: 'verified',
    sources: [
      ['agencia-internacional', 'Reapertura del paso.'],
      ['organismo', 'Aviso oficial de aduana.'],
    ],
    body: [
      { type: 'p', text: 'Un paso fronterizo de cargas reabrió después de dos semanas de bloqueo por una protesta de transportistas. La aduana informó que los camiones vuelven a circular con controles reforzados y que la fila de vehículos demorados se normalizaría en 48 horas.' },
    ],
  },
];
