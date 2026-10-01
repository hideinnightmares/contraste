'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useConsent } from '@/components/privacy/ConsentProvider';

declare global {
  interface Window {
    adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number; pauseAdRequests?: number };
  }
}

/**
 * Bloque de AdSense real. Solo se renderiza cuando hay ID de editor y de bloque.
 * Espera a que la persona decida sobre publicidad personalizada antes de pedir
 * anuncios; si la rechazó, se piden anuncios no personalizados.
 */
export function AdUnit({ client, slot, format }: { client: string; slot: string; format: string }) {
  const ref = useRef<HTMLModElement>(null);
  const pathname = usePathname();
  const { consent } = useConsent();

  useEffect(() => {
    if (!consent || !ref.current || ref.current.dataset.adsbygoogleStatus) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      // Un bloqueador de anuncios o un error de AdSense no debe romper la página.
      console.warn('[ads] No se pudo pedir el anuncio', err);
    }
  }, [consent, pathname]);

  return (
    <ins
      ref={ref}
      key={pathname}
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format === 'fluid' ? 'fluid' : 'auto'}
      data-full-width-responsive="true"
    />
  );
}
