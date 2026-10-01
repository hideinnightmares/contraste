import type { Metadata } from 'next';
import { NewsletterStatus } from '../NewsletterStatus';

export const metadata: Metadata = { title: 'Confirmar suscripción', robots: { index: false, follow: false } };

/**
 * Destino del enlace de confirmación. El newsletter todavía no está habilitado
 * (src/config/newsletter.ts): al habilitarlo, esta página tiene que leer el token
 * de la dirección y confirmarlo con un botón (POST), nunca al abrir el enlace.
 */
export default function ConfirmPage() {
  return (
    <NewsletterStatus title="El newsletter todavía no está habilitado">
      <p>
        Todavía no enviamos el newsletter, así que no hay suscripciones para confirmar. Mientras tanto, podés seguir cada nota
        con el <a href="/rss.xml">feed RSS</a>.
      </p>
    </NewsletterStatus>
  );
}
