import { ads, isAdSenseConfigured, type AdPosition, type AdPositionConfig } from '@/config/ads';
import { AdUnit } from './AdUnit';
import styles from './AdSlot.module.css';

interface Props {
  position: AdPosition;
  /** `band`: franja a todo el ancho; `inline`: dentro de una columna; `sidebar`: columna lateral fija. */
  variant?: 'band' | 'inline' | 'sidebar';
}

const sizeHint: Record<string, string> = {
  horizontal: 'adaptable: 728 × 90 o 970 × 250 en escritorio, 320 × 100 en teléfonos',
  rectangle: '300 × 250 o 300 × 600',
  vertical: '300 × 600',
  fluid: 'adaptable al ancho del texto',
};

/**
 * Espacio publicitario. Siempre lleva la etiqueta "Publicidad", tiene un fondo
 * distinto al editorial y reserva su alto para no mover el contenido al cargar.
 *
 * Sin AdSense configurado muestra un marcador de desarrollo (o nada, si
 * `NEXT_PUBLIC_AD_PLACEHOLDERS=false`). Con AdSense configurado, el `<ins>` real
 * se monta del lado del cliente en `<AdUnit>`.
 */
export function AdSlot({ position, variant = 'inline' }: Props) {
  const config: AdPositionConfig = ads.positions[position];
  const live = isAdSenseConfigured() && config.slotId !== null;
  if (!live && !ads.showPlaceholders) return null;

  const style = {
    '--ad-min-mobile': `${config.reserve.mobile}px`,
    '--ad-min-desktop': `${config.reserve.desktop}px`,
  } as React.CSSProperties;

  const box = (
    <div
      className={`${styles.slot} ${styles[variant]} ${config.desktopOnly ? styles.desktopOnly : ''}`}
      data-ad-position={position}
      style={style}
    >
      <p className={styles.label}>Publicidad</p>
      <div className={styles.box}>
        {live ? (
          <AdUnit client={ads.client!} slot={config.slotId!} format={config.format} />
        ) : (
          <div className={styles.placeholder} data-ad-placeholder>
            <span className={styles.placeholderTitle}>Espacio publicitario</span>
            <span className={styles.placeholderMeta}>
              {config.label}. {sizeHint[config.format]}.
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // La franja superior está fuera de <main>: se marca como región complementaria.
  return variant === 'band' ? (
    <aside className={styles.band} aria-label="Publicidad">
      {box}
    </aside>
  ) : (
    box
  );
}
