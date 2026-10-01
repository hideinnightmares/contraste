/**
 * Fotos del sitio estático.
 *
 * Next arma el `srcset` de cada foto con estos anchos, y el armado del sitio
 * (scripts/postbuild.ts) genera un archivo WebP por ancho. Cada ancho nuevo
 * multiplica los archivos publicados: el plan gratis de Cloudflare acepta hasta
 * 20.000 por versión del sitio.
 */
export const IMAGE_WIDTHS = [384, 640, 960, 1280, 1920] as const;
export const IMAGE_QUALITY = 75;

/** Solo estas fotos tienen versiones pregeneradas; el resto se sirve tal cual. */
export const OWN_IMAGES_PREFIX = '/images/';

/** "/images/demo/rana.jpg", 640 → "/_img/images/demo/rana-640.webp" */
export const imageVariantPath = (src: string, width: number) => `/_img${src.replace(/\.[^./]+$/, '')}-${width}.webp`;
