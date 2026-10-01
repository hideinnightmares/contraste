import { normalize, STOPWORDS } from '@/domain/text';

/**
 * Utilidades de texto del pipeline. Las raíces se aproximan truncando a cinco
 * letras ("habilitan", "habilitado", "habilitación" → "habil"): es tosco, pero
 * determinista, rápido y suficiente para comparar titulares en español.
 */
export function stems(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
    .map((t) => t.slice(0, 5));
}

export function stemSet(text: string): Set<string> {
  return new Set(stems(text));
}

export function overlapCoefficient(a: Set<string>, b: Set<string>): { score: number; shared: number } {
  if (a.size === 0 || b.size === 0) return { score: 0, shared: 0 };
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return { score: shared / Math.min(a.size, b.size), shared };
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared);
}

/** Expresiones que indican que algo no está confirmado por la propia fuente. */
export const HEDGES = [
  'habria',
  'habrian',
  'seria',
  'serian',
  'trascendio',
  'no confirmado',
  'sin confirmar',
  'versiones',
  'segun pudo saber',
  'fuentes extraoficiales',
  'rumor',
];

export function hedged(text: string): boolean {
  const n = normalize(text);
  return HEDGES.some((h) => new RegExp(`(^|[^a-z])${h}([^a-z]|$)`).test(n));
}
