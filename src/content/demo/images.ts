import type { ArticleImage } from '@/domain/types';
import photos from './photos.json';

/**
 * Fotos del dataset de demostración.
 *
 * Son fotos reales de Wikimedia Commons con licencias libres (CC0, CC BY, CC BY-SA,
 * dominio público), descargadas y optimizadas en `public/images/demo/`. Ninguna
 * muestra el hecho narrado —las notas son ficticias—, así que todas se publican
 * como "imagen ilustrativa" y con su autor, licencia y origen visibles.
 */

type PhotoKey = keyof typeof photos;

const text: Record<PhotoKey, { alt: string; caption: string; focal?: { x: number; y: number } }> = {
  parlamento: {
    alt: 'Recinto parlamentario vacío, con bancas dispuestas en semicírculo frente al estrado.',
    caption: 'Recinto del Parlamento Vasco, en España. Imagen ilustrativa.',
  },
  tormenta: {
    alt: 'Un rayo cae sobre el horizonte durante una tormenta nocturna.',
    caption: 'Tormenta eléctrica nocturna. Imagen ilustrativa.',
    focal: { x: 55, y: 60 },
  },
  urna: {
    alt: 'Una mano introduce una boleta en una urna de cartón.',
    caption: 'Votación con urna de cartón. Imagen ilustrativa.',
  },
  supermercado: {
    alt: 'Góndola de supermercado con botellas de salsas y bebidas en estantes iluminados.',
    caption: 'Góndola de supermercado. Imagen ilustrativa.',
  },
  pago: {
    alt: 'Terminal de pago con una tarjeta insertada, apoyada sobre una mesa.',
    caption: 'Terminal de pago con tarjeta. Imagen ilustrativa.',
  },
  cosecha: {
    alt: 'Una cosechadora trabaja un campo de trigo al atardecer mientras descarga el grano en un tractor.',
    caption: 'Cosecha de trigo. Imagen ilustrativa.',
  },
  cumbre: {
    alt: 'Fotografía en blanco y negro de un gran auditorio de conferencias con delegados sentados en gradas.',
    caption: 'Auditorio de conferencias internacionales. Imagen ilustrativa de archivo.',
  },
  puerto: {
    alt: 'Buque portacontenedores amarrado en un puerto, con grúas y pilas de contenedores de colores.',
    caption: 'Terminal de contenedores. Imagen ilustrativa.',
  },
  servidores: {
    alt: 'Racks de servidores con luces azules en un centro de datos.',
    caption: 'Servidores en un centro de datos. Imagen ilustrativa.',
  },
  celular: {
    alt: 'Manos que sostienen un teléfono celular y un vaso de café para llevar.',
    caption: 'Uso de teléfono celular. Imagen ilustrativa.',
  },
  antena: {
    alt: 'Vista aérea de una antena de telecomunicaciones en medio de un campo, rodeada de árboles otoñales.',
    caption: 'Antena de telefonía móvil. Imagen ilustrativa.',
  },
  rana: {
    alt: 'Rana arborícola verde de ojos amarillos posada sobre una hoja.',
    caption: 'Rana arborícola de otra especie. Imagen ilustrativa: la especie de la nota es ficticia.',
    focal: { x: 62, y: 50 },
  },
  observatorio: {
    alt: 'Cúpula de un observatorio astronómico bajo un cielo nocturno lleno de estrellas.',
    caption: 'Observatorio astronómico de noche. Imagen ilustrativa.',
  },
  nubes: {
    alt: 'Nubes de tormenta sobre un río ancho de agua marrón, con una lancha y casas en la orilla.',
    caption: 'Nubes de tormenta sobre un río. Imagen ilustrativa.',
  },
  cine: {
    alt: 'Sala de cine clásica con butacas rojas, palcos curvos y el telón rojo cerrado.',
    caption: 'Sala de cine de estilo clásico. Imagen ilustrativa.',
  },
  muestra: {
    alt: 'Una persona de espaldas observa fotografías enmarcadas en la pared blanca de una galería.',
    caption: 'Muestra de fotografía. Imagen ilustrativa.',
  },
  concierto: {
    alt: 'Escenario de un recital con haces de luces violetas y amarillas sobre el público.',
    caption: 'Recital con público. Imagen ilustrativa.',
  },
  estadio: {
    alt: 'Partido de fútbol en un estadio pequeño, visto desde la tribuna, con público en las gradas de enfrente.',
    caption: 'Partido de fútbol en un estadio de ascenso. Imagen ilustrativa.',
  },
  tribuna: {
    alt: 'Butacas plásticas azules vacías en la tribuna de un estadio.',
    caption: 'Tribuna vacía. Imagen ilustrativa.',
  },
  maraton: {
    alt: 'Piernas de un corredor en plena zancada sobre el asfalto, con medias de compresión azules.',
    caption: 'Corredor en una carrera de calle. Imagen ilustrativa.',
  },
  aro: {
    alt: 'Aro y tablero de básquet al aire libre, fotografiados desde abajo contra un cielo azul.',
    caption: 'Aro de básquet al aire libre. Imagen ilustrativa.',
  },
  calor: {
    alt: 'Torres de departamentos bajo un cielo pálido de bruma, con el sol apenas visible.',
    caption: 'Ciudad bajo bruma de calor. Imagen ilustrativa.',
  },
  aula: {
    alt: 'Aula vacía con bancos de madera, pizarrón verde y luces encendidas.',
    caption: 'Aula escolar. Imagen ilustrativa.',
  },
  terminal: {
    alt: 'Estación de colectivos al anochecer, con estelas de luz de los vehículos y la ciudad de fondo.',
    caption: 'Estación de ómnibus al anochecer. Imagen ilustrativa.',
  },
  escritorio: {
    alt: 'Escritorio con una computadora portátil, anteojos, una calculadora y papeles, iluminado por luz lateral.',
    caption: 'Escritorio de trabajo. Imagen ilustrativa.',
  },
  cafe: {
    alt: 'Manos de un barista presionando café molido en el portafiltro de una máquina de espresso.',
    caption: 'Preparación de un espresso. Imagen ilustrativa.',
  },
  bicicleta: {
    alt: 'Una persona cruza una avenida de noche junto a su bicicleta, con edificios iluminados de fondo.',
    caption: 'Ciclista en la ciudad de noche. Imagen ilustrativa.',
  },
  balcones: {
    alt: 'Edificio de departamentos con balcones cubiertos de plantas, visto desde un jardín arbolado.',
    caption: 'Balcones con plantas. Imagen ilustrativa.',
  },
  tocadiscos: {
    alt: 'Tocadiscos con la tapa abierta y un disco de vinilo sobre el plato.',
    caption: 'Tocadiscos. Imagen ilustrativa.',
  },
};

export function demoImage(key: PhotoKey): ArticleImage {
  const photo = photos[key];
  const { alt, caption, focal } = text[key];
  return {
    src: photo.src,
    width: photo.width,
    height: photo.height,
    blurDataURL: photo.blurDataURL,
    alt,
    caption,
    focal,
    illustrative: true,
    credit: photo.credit,
  };
}

export type { PhotoKey };
