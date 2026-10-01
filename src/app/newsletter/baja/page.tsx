import type { Metadata } from 'next';
import Link from 'next/link';
import { NewsletterStatus } from '../NewsletterStatus';

export const metadata: Metadata = { title: 'Darse de baja', robots: { index: false, follow: false } };

/**
 * Destino del enlace de baja. El newsletter todavía no está habilitado
 * (src/config/newsletter.ts): al habilitarlo, esta página tiene que leer el token
 * de la dirección y dar de baja con un botón (POST), nunca al abrir el enlace.
 */
export default function UnsubscribePage() {
  return (
    <NewsletterStatus title="El newsletter todavía no está habilitado">
      <p>
        Todavía no enviamos el newsletter, así que no hay ninguna suscripción para dar de baja. Si tenés una consulta sobre tus
        datos, escribinos desde la página de <Link href="/privacidad#derechos">privacidad</Link>.
      </p>
    </NewsletterStatus>
  );
}
