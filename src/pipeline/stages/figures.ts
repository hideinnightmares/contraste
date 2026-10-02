import { normalize, STOPWORDS } from '@/domain/text';
import type { Figure } from '../types';

/**
 * Extracción de cifras en español: "420 metros", "120 millones de dólares",
 * "2,5%", "US$ 15.000 millones". Devuelve valor normalizado, unidad y las
 * palabras de contexto que la preceden, para comparar cifras sobre lo mismo.
 */

const MULTIPLIERS: [RegExp, number][] = [
  [/^mil millones/, 1e9],
  [/^billones?/, 1e12],
  [/^millones?|^millon/, 1e6],
  [/^mil\b/, 1e3],
];

const UNITS: [RegExp, string][] = [
  [/^(de\s+)?(dolares|usd|us\$|u\$s)/, 'usd'],
  [/^(de\s+)?(euros)/, 'eur'],
  [/^(de\s+)?pesos/, 'ars'],
  [/^(%|por ciento)/, 'percent'],
  [/^(kilometros por hora|km\/h)/, 'kmh'],
  [/^(kilometros|km)\b/, 'km'],
  [/^metros\b/, 'm'],
  [/^toneladas\b/, 't'],
  [/^(hectareas|ha)\b/, 'ha'],
  [/^meses\b/, 'months'],
  [/^anos\b/, 'years'],
  [/^dias\b/, 'days'],
  [/^horas\b/, 'hours'],
  [/^(personas|habitantes|vecinos|trabajadores)\b/, 'people'],
];

const NUMBER = /(?:us\$|u\$s|\$)?\s?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?/g;

export function extractFigures(text: string, itemId: string): Figure[] {
  // `normalize` conserva posiciones para texto en NFC, así que se puede cortar el original.
  const norm = normalize(text);
  const figures: Figure[] = [];
  let m: RegExpExecArray | null;
  NUMBER.lastIndex = 0;
  while ((m = NUMBER.exec(norm))) {
    const intPart = m[1].replace(/\./g, '');
    const decimals = m[2] ? `.${m[2]}` : '';
    let value = Number(`${intPart}${decimals}`);
    if (!Number.isFinite(value)) continue;

    const prefixCurrency = /^(us\$|u\$s)/.test(m[0].trim()) ? 'usd' : /^\$/.test(m[0].trim()) ? 'ars' : null;
    let end = m.index + m[0].length;
    const skipSpaces = () => {
      while (norm[end] === ' ') end++;
    };
    skipSpaces();

    for (const [re, mult] of MULTIPLIERS) {
      const mm = re.exec(norm.slice(end));
      if (mm) {
        value *= mult;
        end += mm[0].length;
        skipSpaces();
        break;
      }
    }

    let unit: string | null = prefixCurrency;
    for (const [re, u] of UNITS) {
      const um = re.exec(norm.slice(end));
      if (um) {
        unit = unit ?? u;
        end += um[0].length;
        break;
      }
    }
    // Un año suelto (1900-2099) sin unidad es una fecha, no una cifra.
    if (!unit && /^(19|20)\d{2}$/.test(intPart) && !decimals) continue;

    const before = norm
      .slice(Math.max(0, m.index - 80), m.index)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
      .slice(-5)
      .map((t) => t.slice(0, 5));

    const lead =
      norm
        .slice(Math.max(0, m.index - 30), m.index)
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .pop() ?? '';

    figures.push({
      raw: text.slice(m.index, end).trim(),
      value,
      unit,
      context: before,
      lead,
      itemId,
    });
  }
  return figures;
}

/**
 * Unidades de tiempo: "murió a los 96 años" (una edad) y "fue juez durante 22 años" (una
 * duración) comparten contexto sin hablar de lo mismo. Para compararlas, también tiene que
 * coincidir la palabra justo antes de la cifra.
 */
const TIME_UNITS = new Set(['years', 'months', 'days', 'hours']);

/** Dos cifras hablan de lo mismo si tienen la misma unidad y comparten contexto. */
export function sameSubject(a: Figure, b: Figure): boolean {
  if (a.unit !== b.unit || a.unit === null) return false;
  if (TIME_UNITS.has(a.unit) && a.lead !== b.lead) return false;
  const shared = a.context.filter((t) => b.context.includes(t)).length;
  return shared >= 1;
}

export function differs(a: number, b: number, tolerance: number): boolean {
  const max = Math.max(Math.abs(a), Math.abs(b));
  if (max === 0) return false;
  return Math.abs(a - b) / max > tolerance;
}
