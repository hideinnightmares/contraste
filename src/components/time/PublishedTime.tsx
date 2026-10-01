'use client';

import { useSyncExternalStore } from 'react';
import { formatPublished, formatTimelineTime } from '@/domain/dates';

const neverChanges = () => () => {};

/**
 * Fecha de publicación ("Hoy, 15:45").
 *
 * El sitio es estático: el HTML trae la etiqueta calculada al armarlo, y el
 * navegador la vuelve a calcular con la hora real. Así "Hoy" no queda mintiendo
 * después de medianoche, entre un armado y el siguiente.
 */
export function PublishedTime({
  iso,
  builtAt,
  variant = 'listing',
  className,
}: {
  iso: string;
  /** Momento en que se armó la página (ISO). */
  builtAt: string;
  /** `timeline`: solo la hora si es de hoy (línea de tiempo de la portada). */
  variant?: 'listing' | 'timeline';
  className?: string;
}) {
  const format = variant === 'timeline' ? formatTimelineTime : formatPublished;
  const text = useSyncExternalStore(
    neverChanges,
    () => format(iso, new Date()),
    () => format(iso, new Date(builtAt)),
  );
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
