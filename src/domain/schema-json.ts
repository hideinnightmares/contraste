import { z } from 'zod';
import { articleSchema } from './schema';

/**
 * El esquema de una nota en JSON Schema, para validar en la base (pg_jsonschema).
 *
 * Cubre la forma de cada campo. Las reglas que cruzan campos (fuentes citadas que existen,
 * publicar solo lo verificado, etc.) las aplica el trigger `private.articles_reglas` en la base
 * y `articleSchema` en la aplicación.
 */
export function notaJsonSchema(): unknown {
  return z.toJSONSchema(articleSchema, { io: 'input', unrepresentable: 'any' });
}
