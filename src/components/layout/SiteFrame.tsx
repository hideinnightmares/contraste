'use client';

import { usePathname } from 'next/navigation';
import { ConsentProvider } from '@/components/privacy/ConsentProvider';

/** Rutas que no llevan el marco del diario. */
const WITHOUT_FRAME = ['/redaccion'];

/**
 * Marco del diario: cabecera, publicidad, pie y aviso de cookies.
 *
 * La mesa de redacción no lo lleva: no tiene publicidad (AdSense no permite anuncios en
 * pantallas internas ni de inicio de sesión) ni pide consentimiento. Se decide por la
 * dirección y no con un grupo de rutas porque cada nivel de diseño de Next.js agrega un
 * archivo por página al sitio estático, y el plan gratis de Cloudflare limita los archivos.
 * Como el sitio es estático, cada página se genera ya con la decisión tomada.
 */
export function SiteFrame({
  header,
  topAd,
  footer,
  extras,
  children,
}: {
  header: React.ReactNode;
  topAd: React.ReactNode;
  footer: React.ReactNode;
  extras: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '/';
  if (WITHOUT_FRAME.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return children;
  return (
    <ConsentProvider>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      {header}
      {topAd}
      <main id="contenido" tabIndex={-1}>
        {children}
      </main>
      {footer}
      {extras}
    </ConsentProvider>
  );
}
