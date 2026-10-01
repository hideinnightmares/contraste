import { IMAGE_WIDTHS, OWN_IMAGES_PREFIX, imageVariantPath } from '../config/images';

/**
 * Cargador de `next/image` para el sitio estático: en lugar de redimensionar en un
 * servidor, apunta a la versión pregenerada del ancho más cercano por arriba.
 * En desarrollo y para fotos externas devuelve la original.
 */
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (!src.startsWith(OWN_IMAGES_PREFIX)) return src;
  if (process.env.NODE_ENV !== 'production') return `${src}?w=${width}`;
  const variant = IMAGE_WIDTHS.find((w) => w >= width) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
  return imageVariantPath(src, variant);
}
