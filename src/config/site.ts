/**
 * Identidad y datos institucionales del medio.
 *
 * Todo lo que figura como `null` es información que solo puede completar el
 * responsable del medio (razón social, contacto, domicilio). La interfaz
 * muestra esos campos como pendientes en lugar de inventarlos.
 */
export const site = {
  name: 'Contraste',
  tagline: 'Noticias contrastadas con más de una fuente',
  description:
    'Contraste es un diario digital que publica noticias de actualidad verificadas contra más de una fuente, con las fuentes consultadas a la vista.',
  /** URL pública canónica. Se define por entorno para no publicar URLs de desarrollo. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  locale: 'es-AR',
  language: 'es',
  timeZone: 'America/Argentina/Buenos_Aires',
  /**
   * Modo demostración: mientras sea `true`, todo el contenido es ficticio, se marca
   * como DEMO en la interfaz y se excluye de buscadores (noindex + fuera del sitemap).
   */
  demoMode: process.env.CONTRASTE_DEMO_MODE !== 'false',
  organization: {
    legalName: null as string | null,
    taxId: null as string | null, // CUIT
    address: null as string | null,
    contactEmail: null as string | null,
    privacyEmail: null as string | null,
    editorInChief: null as string | null,
    foundingYear: null as number | null,
  },
  social: {
    x: null as string | null,
    instagram: null as string | null,
  },
} as const;

export type SiteConfig = typeof site;

/** Construye una URL absoluta a partir de una ruta del sitio. */
export function absoluteUrl(path = '/'): string {
  return `${site.url}${path.startsWith('/') ? path : `/${path}`}`;
}
