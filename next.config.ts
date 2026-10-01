import type { NextConfig } from 'next';
import { IMAGE_QUALITY, IMAGE_WIDTHS } from './src/config/images';

/**
 * Sitio estático: `next build` genera todas las páginas en `out/` y Cloudflare
 * las sirve como archivos (ver docs/DESPLIEGUE.md). Lo que necesita servidor
 * (ISR, Server Actions, rutas que leen el pedido, encabezados) no está disponible:
 * los encabezados de seguridad van en `public/_headers`.
 */
const nextConfig: NextConfig = {
  output: 'export',
  poweredByHeader: false,
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    // El srcset usa la unión de los dos: los anchos de IMAGE_WIDTHS.
    imageSizes: [IMAGE_WIDTHS[0]],
    deviceSizes: IMAGE_WIDTHS.slice(1),
    qualities: [IMAGE_QUALITY],
  },
};

export default nextConfig;
