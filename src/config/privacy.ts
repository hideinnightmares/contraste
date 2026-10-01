/**
 * Consentimiento, almacenamiento local y servicios de terceros.
 *
 * Regla del sitio: nada que no sea estrictamente necesario se carga sin una decisión
 * explícita de la persona. La lista `storage` alimenta la Política de cookies, así
 * que lo que se documenta es exactamente lo que el código guarda.
 */

export type ConsentCategory = 'necessary' | 'analytics' | 'advertising';

export interface ConsentState {
  /** Versión de los textos aceptados; si cambia, se vuelve a preguntar. */
  version: number;
  analytics: boolean;
  advertising: boolean;
  decidedAt: string;
}

export const CONSENT_VERSION = 1;

export const consentCategories: Record<
  ConsentCategory,
  { name: string; description: string; required: boolean }
> = {
  necessary: {
    name: 'Necesarias',
    description:
      'Guardan tus preferencias de este sitio, como el modo oscuro y esta misma decisión. No se usan para identificarte ni se comparten.',
    required: true,
  },
  analytics: {
    name: 'Medición',
    description:
      'Permitirían contar visitas de forma agregada para saber qué notas se leen. Hoy no hay ninguna herramienta de medición instalada.',
    required: false,
  },
  advertising: {
    name: 'Publicidad personalizada',
    description:
      'Permitirían que Google y sus socios usen cookies para mostrar anuncios según tus intereses. Si no aceptás, los anuncios pueden seguir apareciendo, pero sin personalización.',
    required: false,
  },
};

/** Lo que el sitio guarda en el navegador hoy. Se muestra en /cookies. */
export const storage = [
  {
    key: 'contraste-theme',
    kind: 'localStorage',
    category: 'necessary' as ConsentCategory,
    purpose: 'Recordar si elegiste modo claro u oscuro.',
    duration: 'Hasta que lo borres desde el navegador.',
  },
  {
    key: 'contraste-consent',
    kind: 'localStorage',
    category: 'necessary' as ConsentCategory,
    purpose: 'Recordar tu decisión sobre medición y publicidad para no volver a preguntarte.',
    duration: '12 meses; después se vuelve a preguntar.',
  },
] as const;

export const CONSENT_MAX_AGE_DAYS = 365;

/** Servicios de terceros que el sitio puede activar. Ninguno carga sin configuración. */
export const thirdParties = [
  {
    name: 'Google AdSense',
    purpose: 'Publicidad',
    loadsWhen:
      'Solo si se configuró un ID de editor y después de que decidas sobre la publicidad personalizada.',
    policyUrl: 'https://policies.google.com/technologies/ads?hl=es-419',
  },
] as const;
