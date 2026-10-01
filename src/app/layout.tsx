import type { Metadata, Viewport } from 'next';
import { Archivo, Newsreader } from 'next/font/google';
import { site } from '@/config/site';
import { robotsFor } from '@/lib/seo';
import { SiteHeader } from '@/components/header/SiteHeader';
import { SiteFooter } from '@/components/footer/SiteFooter';
import { AdSlot } from '@/components/ads/AdSlot';
import { AdSenseLoader } from '@/components/ads/AdSenseLoader';
import { ConsentProvider } from '@/components/privacy/ConsentProvider';
import { ConsentBanner } from '@/components/privacy/ConsentBanner';
import { RevealObserver } from '@/components/motion/RevealObserver';
import { THEME_STORAGE_KEY } from '@/components/header/theme';
import './globals.css';

// Fuentes autoalojadas por next/font: el navegador no hace pedidos a Google.
// Archivo (ancho y peso variables) hace de titulares condensados y de interfaz;
// Newsreader es la serif de lectura. Ver DESIGN.md.
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-newsreader',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: ${site.tagline.toLowerCase()}`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': [{ url: '/rss.xml', title: `${site.name}: últimas notas` }] },
  },
  robots: robotsFor(site.demoMode),
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: 'es_AR',
    title: site.name,
    description: site.description,
  },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0b' },
  ],
  colorScheme: 'light dark',
};

// Corre antes del primer pintado: aplica el tema guardado y habilita las animaciones
// de aparición solo si hay JavaScript (sin JS, todo se ve desde el principio).
const bootScript = `(function(){var d=document.documentElement;d.classList.remove('no-js');try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')d.setAttribute('data-theme',t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es-AR"
      className={`no-js ${archivo.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <ConsentProvider>
          <a className="skip-link" href="#contenido">
            Saltar al contenido
          </a>
          <SiteHeader />
          <AdSlot position="top-banner" variant="band" />
          <main id="contenido" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
          <ConsentBanner />
          <AdSenseLoader />
          <RevealObserver />
        </ConsentProvider>
      </body>
    </html>
  );
}
