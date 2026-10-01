import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    lang: site.locale,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0e1a2b',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/logo-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
