import { z } from 'zod';
import { editorial } from '@/config/editorial';
import { articleSchema } from '@/domain/schema';
import { truncate } from '@/domain/text';
import type { Article, BodyBlock, ContentType, ReviewStatus } from '@/domain/types';

/**
 * Lógica de la mesa de redacción, sin pantalla ni base: qué se puede editar, cómo se aplica
 * una corrección y qué está mal antes de guardar. La base vuelve a controlar todo al guardar
 * (formato, reglas de publicación, fechas): esto solo evita viajes inútiles y explica mejor.
 */

z.config(z.locales.es());

export interface EditableFields {
  title: string;
  dek: string;
  category: string;
  type: ContentType;
  /** Temas separados por comas. */
  tags: string;
  body: BodyBlock[];
  seoDescription: string;
}

export function fieldsFrom(article: Article): EditableFields {
  return {
    title: article.title,
    dek: article.dek,
    category: article.category,
    type: article.type,
    tags: article.tags.join(', '),
    body: article.body,
    seoDescription: article.seo.description ?? '',
  };
}

/** "Clima, La Niña, clima" → ["Clima", "La Niña"]: sin vacíos ni repetidos. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input.split(',')) {
    const tag = raw.trim().replace(/\s+/g, ' ');
    const key = tag.toLocaleLowerCase('es');
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}

const clean = (text: string) => text.trim().replace(/[ \t]+\n/g, '\n');

function cleanBlock(block: BodyBlock): BodyBlock {
  switch (block.type) {
    case 'p':
    case 'h2':
      return { ...block, text: clean(block.text) };
    case 'list':
      return { ...block, items: block.items.map(clean).filter(Boolean) };
    case 'facts':
      return { ...block, confirmed: block.confirmed.map(clean).filter(Boolean), unconfirmed: block.unconfirmed.map(clean).filter(Boolean) };
    case 'note':
      return { ...block, title: clean(block.title), text: clean(block.text) };
  }
}

export function applyFields(article: Article, fields: EditableFields): Article {
  const title = clean(fields.title);
  // El título para buscadores sigue al título cuando este cambia; la descripción la escribe la redacción.
  const seoTitle = title === article.title ? article.seo.title : truncate(title, editorial.seo.maxTitleLength);
  return {
    ...article,
    title,
    dek: clean(fields.dek),
    category: fields.category,
    type: fields.type,
    tags: parseTags(fields.tags),
    body: fields.body.map(cleanBlock),
    seo: { title: seoTitle, description: clean(fields.seoDescription) || undefined },
  };
}

export function withStatus(article: Article, status: ReviewStatus): Article {
  return { ...article, review: { ...article.review, status } };
}

/** Agrega una nota de corrección al historial público de la nota. */
export function withCorrection(article: Article, note: string, now: Date): Article {
  return { ...article, updates: [...article.updates, { at: now.toISOString(), text: clean(note) }] };
}

/** ¿Cambió lo que lee el público? (no cuenta el estado de revisión ni el historial). */
export function contentChanged(before: Article, after: Article): boolean {
  const visible = (article: Article) => JSON.stringify({ ...article, review: null, updates: null, updatedAt: null });
  return visible(before) !== visible(after);
}

const FIELD_NAMES: Record<string, string> = {
  title: 'Título',
  dek: 'Bajada',
  category: 'Sección',
  type: 'Formato',
  tags: 'Temas',
  body: 'Cuerpo',
  'seo.description': 'Descripción para buscadores',
  'seo.title': 'Título para buscadores',
  sources: 'Fuentes',
  verification: 'Verificación',
  review: 'Revisión',
};

function fieldName(path: PropertyKey[]): string {
  const key = path.map(String).join('.');
  if (FIELD_NAMES[key]) return FIELD_NAMES[key];
  const [head, index] = path;
  if (head === 'body' && typeof index === 'number') return `Cuerpo, bloque ${index + 1}`;
  if (head === 'tags' && typeof index === 'number') return `Temas, tema ${index + 1}`;
  return FIELD_NAMES[String(head)] ?? key;
}

export interface Issue {
  field: string;
  message: string;
}

/** Problemas de la nota tal como quedaría guardada, con nombres de campo en castellano. */
export function validationIssues(article: Article): Issue[] {
  const issues: Issue[] = [];
  const result = articleSchema.safeParse(article);
  if (!result.success) {
    for (const i of result.error.issues) issues.push({ field: fieldName(i.path), message: i.message });
  }
  const description = article.seo.description ?? '';
  if (description.length > editorial.seo.maxDescriptionLength) {
    issues.push({
      field: 'Descripción para buscadores',
      message: `Tiene ${description.length} caracteres; los buscadores muestran hasta ${editorial.seo.maxDescriptionLength}.`,
    });
  }
  return issues;
}
