/**
 * Publicidad (Google AdSense).
 *
 * DÓNDE VA EL CÓDIGO REAL DE ADSENSE
 * 1. `NEXT_PUBLIC_ADSENSE_CLIENT`: el ID de editor, con la forma `ca-pub-XXXXXXXXXXXXXXXX`.
 *    Lo da AdSense al aprobar el sitio. No hay ninguno cargado y no se inventa.
 * 2. `NEXT_PUBLIC_ADSENSE_SLOT_*`: el ID de cada bloque de anuncios creado en AdSense
 *    (Anuncios > Por bloque de anuncios). Uno por posición de abajo.
 * 3. Con esos valores, `<AdSenseLoader>` inserta el script oficial
 *    `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=...`
 *    y `<AdSlot>` renderiza el `<ins class="adsbygoogle">` correspondiente.
 * 4. `/ads.txt` se genera solo a partir del ID de editor.
 *
 * Mientras no haya ID, los espacios muestran un marcador de desarrollo (con el tamaño
 * reservado, para medir el impacto en el diseño) y no se carga ningún script de terceros.
 */

export type AdPosition =
  | 'top-banner'
  | 'home-infeed'
  | 'home-sidebar'
  | 'article-inline'
  | 'article-sidebar'
  | 'section-infeed'
  | 'section-sidebar';

export interface AdPositionConfig {
  /** Nombre interno, visible solo en el marcador de desarrollo. */
  label: string;
  /** Formato que se pide a AdSense. */
  format: 'horizontal' | 'rectangle' | 'vertical' | 'fluid';
  /** Alto reservado para evitar saltos de diseño (CLS), por breakpoint. */
  reserve: { mobile: number; desktop: number };
  /** Solo se muestra en pantallas anchas (columna lateral). */
  desktopOnly?: boolean;
  slotId: string | null;
}

// Las variables NEXT_PUBLIC_ se leen con nombre literal para que Next las incorpore al bundle del cliente.
const clean = (value: string | undefined): string | null => {
  return value && value.trim() !== '' ? value.trim() : null;
};

export const ads = {
  client: clean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT),
  /** ID de autoridad de certificación de Google para ads.txt (publicado por Google). */
  adsTxtCertificationId: 'f08c47fec0942fa0',
  /** Muestra marcadores grises cuando no hay ID configurado. Apagar en producción. */
  showPlaceholders: process.env.NEXT_PUBLIC_AD_PLACEHOLDERS !== 'false',
  positions: {
    'top-banner': {
      label: 'Banner superior',
      format: 'horizontal',
      reserve: { mobile: 100, desktop: 90 },
      slotId: clean(process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP),
    },
    'home-infeed': {
      label: 'Entre secciones de portada',
      format: 'horizontal',
      reserve: { mobile: 250, desktop: 250 },
      slotId: clean(process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_INFEED),
    },
    'home-sidebar': {
      label: 'Lateral de portada',
      format: 'rectangle',
      reserve: { mobile: 0, desktop: 600 },
      desktopOnly: true,
      slotId: clean(process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_SIDEBAR),
    },
    'article-inline': {
      label: 'Dentro de la nota',
      format: 'fluid',
      reserve: { mobile: 280, desktop: 280 },
      slotId: clean(process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_INLINE),
    },
    'article-sidebar': {
      label: 'Lateral de la nota',
      format: 'vertical',
      reserve: { mobile: 0, desktop: 600 },
      desktopOnly: true,
      slotId: clean(process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_SIDEBAR),
    },
    'section-infeed': {
      label: 'Dentro del listado de sección',
      format: 'horizontal',
      reserve: { mobile: 250, desktop: 250 },
      slotId: clean(process.env.NEXT_PUBLIC_ADSENSE_SLOT_SECTION_INFEED),
    },
    'section-sidebar': {
      label: 'Lateral de sección y listados',
      format: 'vertical',
      reserve: { mobile: 0, desktop: 600 },
      desktopOnly: true,
      slotId: clean(process.env.NEXT_PUBLIC_ADSENSE_SLOT_SECTION_SIDEBAR),
    },
  } satisfies Record<AdPosition, AdPositionConfig>,
} as const;

export function isAdSenseConfigured(): boolean {
  return ads.client !== null && /^ca-pub-\d{10,20}$/.test(ads.client);
}

/** Línea de ads.txt según el formato publicado por Google. `null` si no hay editor. */
export function adsTxtLine(): string | null {
  if (!isAdSenseConfigured() || !ads.client) return null;
  const publisher = ads.client.replace(/^ca-/, '');
  return `google.com, ${publisher}, DIRECT, ${ads.adsTxtCertificationId}`;
}
