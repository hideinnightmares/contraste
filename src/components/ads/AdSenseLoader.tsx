'use client';

import Script from 'next/script';
import { ads, isAdSenseConfigured } from '@/config/ads';
import { useConsent } from '@/components/privacy/ConsentProvider';

/**
 * Carga el script oficial de AdSense, una sola vez y solo después de que la
 * persona haya decidido sobre la publicidad personalizada.
 *
 * Importante para producción: para servir anuncios personalizados a visitantes
 * del Espacio Económico Europeo, Reino Unido y Suiza, Google exige una plataforma
 * de consentimiento (CMP) certificada e integrada con el TCF de IAB. Este aviso
 * propio no lo es; ver docs/ADSENSE.md.
 */
export function AdSenseLoader() {
  const { consent } = useConsent();
  if (!isAdSenseConfigured() || !consent) return null;

  const setup = `(window.adsbygoogle=window.adsbygoogle||[]).requestNonPersonalizedAds=${consent.advertising ? 0 : 1};`;
  return (
    <>
      <Script id="adsense-setup" strategy="afterInteractive">
        {setup}
      </Script>
      <Script
        id="adsense"
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}`}
        crossOrigin="anonymous"
      />
    </>
  );
}
