import { site } from '@/config/site';

/**
 * Fechas en hora de Buenos Aires y formato argentino, siempre con zona horaria
 * explícita. Así el resultado no depende de la configuración regional de la
 * máquina que arma el sitio ni del navegador.
 */

const tz = site.timeZone;

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(site.locale, { timeZone: tz, ...options });

const longDate = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const dayMonth = fmt({ day: 'numeric', month: 'long' });
const dayMonthYear = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
const time = fmt({ hour: '2-digit', minute: '2-digit', hour12: false });
const dayKey = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' });

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Jueves 1 de octubre de 2026" */
export function formatLongDate(date: Date | string): string {
  return capitalize(longDate.format(new Date(date)));
}

/** "09:40" */
export function formatTime(date: Date | string): string {
  return time.format(new Date(date));
}

/** Día calendario en Buenos Aires, para comparar fechas sin errores de zona horaria. */
export function calendarDay(date: Date | string): string {
  return dayKey.format(new Date(date));
}

/**
 * Fecha de publicación para listados:
 * - mismo día: "Hoy, 09:40"
 * - día anterior: "Ayer, 18:20"
 * - más antigua: "28 de septiembre, 18:20" (con año si no es el actual)
 */
export function formatPublished(date: Date | string, now: Date = new Date()): string {
  const d = new Date(date);
  const today = calendarDay(now);
  const yesterday = calendarDay(new Date(now.getTime() - 24 * 3600 * 1000));
  const day = calendarDay(d);
  if (day === today) return `Hoy, ${formatTime(d)}`;
  if (day === yesterday) return `Ayer, ${formatTime(d)}`;
  const sameYear = day.slice(-4) === today.slice(-4);
  return `${(sameYear ? dayMonth : dayMonthYear).format(d)}, ${formatTime(d)}`;
}

/** Línea de tiempo de la portada: solo la hora si es del mismo día; si no, como en los listados. */
export function formatTimelineTime(date: Date | string, now: Date = new Date()): string {
  return calendarDay(date) === calendarDay(now) ? formatTime(date) : formatPublished(date, now);
}

/** "1 de octubre de 2026, 09:40" — para el encabezado de la nota. */
export function formatFull(date: Date | string): string {
  const d = new Date(date);
  return `${dayMonthYear.format(d)}, ${formatTime(d)}`;
}

export function hoursBetween(a: Date | string, b: Date | string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
}
