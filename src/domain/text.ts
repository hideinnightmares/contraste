import type { BodyBlock } from './types';

/** Minúsculas y sin diacríticos, para comparar y buscar ("Economía" → "economia"). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function slugify(text: string): string {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');
}

/** Palabras vacías del español que no aportan a la búsqueda ni a la deduplicación. */
export const STOPWORDS = new Set(
  'a al ante bajo con contra de del desde durante e el en entre es hacia hasta la las le les lo los mas mientras o para pero por que se sin sobre su sus tras un una uno unos unas y ya como cual cuando donde esta este esto estos estas fue fueron ha han hay ser son sera seran mas menos muy no ni tambien otra otro otras otros'.split(
    ' ',
  ),
);

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function blockText(block: BodyBlock): string {
  switch (block.type) {
    case 'p':
    case 'h2':
      return block.text;
    case 'list':
      return block.items.join(' ');
    case 'facts':
      return [...block.confirmed, ...block.unconfirmed].join(' ');
    case 'note':
      return `${block.title} ${block.text}`;
  }
}

export function bodyText(body: BodyBlock[]): string {
  return body.map(blockText).join('\n');
}

/** Palabras del cuerpo de una nota, contando todos sus bloques. */
export function bodyWordCount(body: BodyBlock[]): number {
  return bodyText(body).split(/\s+/).filter(Boolean).length;
}

/** Minutos de lectura estimados a 200 palabras por minuto, mínimo uno. */
export function readingMinutes(body: BodyBlock[]): number {
  return Math.max(1, Math.round(bodyWordCount(body) / 200));
}

/** Recorta en el último límite de palabra sin superar `max` caracteres. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, '')}…`;
}
