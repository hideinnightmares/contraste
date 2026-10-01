import type { DemoSpec } from '../builder';

export const ciencia: DemoSpec[] = [
  {
    slug: 'investigadores-describen-posible-nueva-especie-rana',
    title: 'Investigadores describen lo que podría ser una nueva especie de rana arborícola en la selva paranaense',
    dek: 'El equipo presentó el hallazgo en un congreso. La clasificación como especie nueva todavía tiene que pasar la revisión de otros científicos.',
    category: 'ciencia',
    tags: ['Biodiversidad', 'Investigación', 'Selva paranaense'],
    image: 'rana',
    minutesAgo: 180,
    priority: 4,
    status: 'partial',
    sources: [
      ['universidad', 'Presentación del equipo en el congreso.'],
      ['organismo', 'Permisos de colecta otorgados al equipo.'],
      ['diario-regional', 'Cobertura del congreso y contexto del área.'],
    ],
    claims: [
      { text: 'El equipo presentó el hallazgo en un congreso de herpetología.', status: 'confirmed', sources: ['universidad', 'diario-regional'] },
      { text: 'Se trata de una especie nueva para la ciencia.', status: 'unconfirmed', sources: ['universidad'] },
    ],
    body: [
      { type: 'p', text: 'Un equipo de una universidad pública presentó en un congreso de herpetología la descripción preliminar de una rana arborícola que, según sus análisis genéticos, no coincide con ninguna especie registrada. Los ejemplares fueron hallados en un área protegida de la selva paranaense, con permisos de colecta otorgados por el organismo ambiental.' },
      { type: 'facts', confirmed: ['La presentación en el congreso y los permisos de colecta.', 'Que los análisis del equipo no encontraron coincidencias con especies registradas.'], unconfirmed: ['Que sea una especie nueva: la clasificación requiere un artículo revisado por pares, que todavía no se publicó.', 'El nombre científico, que el equipo no dio a conocer.'] },
      { type: 'p', text: 'Los investigadores explicaron que en casos así es habitual que la revisión pida más ejemplares o análisis adicionales antes de aceptar una especie nueva. Hasta entonces, el hallazgo se considera una hipótesis bien fundada, no una conclusión.' },
      { type: 'p', text: 'El área donde se encontraron los ejemplares es una de las más estudiadas de la región, lo que, según el equipo, muestra cuánto falta conocer de su biodiversidad.' },
    ],
  },
  {
    slug: 'observatorio-registra-estallido-rayos-gamma',
    title: 'Un observatorio de altura registró un posible estallido de rayos gamma; otros telescopios buscan confirmarlo',
    dek: 'La señal fue detectada durante pocos segundos. Si se confirma, sería una de las más brillantes registradas por ese instrumento.',
    category: 'ciencia',
    tags: ['Astronomía', 'Investigación'],
    image: 'observatorio',
    minutesAgo: 1680,
    priority: 3,
    status: 'developing',
    sources: [
      ['universidad', 'Aviso del equipo del observatorio a la red de alertas astronómicas.'],
      ['agencia-internacional', 'Respuesta de otros observatorios.'],
    ],
    claims: [
      { text: 'El observatorio emitió un aviso a la red internacional de alertas.', status: 'confirmed', sources: ['universidad', 'agencia-internacional'] },
      { text: 'La señal corresponde a un estallido de rayos gamma.', status: 'unconfirmed', sources: ['universidad'] },
    ],
    body: [
      { type: 'p', text: 'Un observatorio de altura detectó durante pocos segundos una señal que podría corresponder a un estallido de rayos gamma, uno de los fenómenos más energéticos del universo. El equipo emitió un aviso a la red internacional de alertas para que otros telescopios apunten a la misma región del cielo.' },
      { type: 'p', text: 'La confirmación depende de que otros instrumentos registren el resplandor posterior al estallido en las próximas horas. Si eso no ocurre, la señal podría deberse a un error instrumental, una posibilidad que el propio equipo mencionó en su aviso.' },
    ],
  },
  {
    slug: 'la-nina-que-es-y-por-que-importa-verano',
    title: 'Qué es La Niña y por qué importa para el verano',
    dek: 'Un fenómeno del océano Pacífico que puede cambiar las lluvias a miles de kilómetros. Qué se sabe de su efecto en la región y qué no puede anticiparse.',
    category: 'ciencia',
    type: 'explicador',
    tags: ['Clima', 'La Niña', 'Campo'],
    image: 'nubes',
    minutesAgo: 2400,
    priority: 3,
    status: 'verified',
    sources: [
      ['servicio-meteorologico', 'Explicación del fenómeno y perspectiva estacional.'],
      ['universidad', 'Investigación sobre el impacto regional de La Niña.'],
    ],
    body: [
      { type: 'p', text: 'La Niña es la fase fría de un ciclo natural del océano Pacífico tropical: durante algunos meses, el agua superficial del centro y el este de ese océano se enfría más de lo normal. Ese cambio altera la circulación de la atmósfera y puede modificar las lluvias en regiones muy lejanas.' },
      { type: 'h2', text: 'Qué suele pasar en la región' },
      { type: 'p', text: 'En el centro y el noreste del país, los años con La Niña tienden a tener menos lluvias que lo normal en primavera y verano. Es una tendencia estadística, no una regla: hubo años con La Niña y lluvias normales.' },
      { type: 'facts', confirmed: ['La Niña es un fenómeno del Pacífico tropical que influye en el clima regional.', 'En la región se asocia con una tendencia a menos lluvias.'], unconfirmed: ['Cuánto va a llover en un mes o lugar determinado: la perspectiva estacional no puede anticiparlo.'] },
      { type: 'p', text: 'Por eso, los servicios meteorológicos hablan de probabilidades. Para decisiones concretas, como cuándo sembrar o cómo planificar el uso del agua, recomiendan seguir los pronósticos de corto plazo.' },
    ],
  },
];
