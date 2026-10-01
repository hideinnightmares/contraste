import { z } from 'zod';
import { categories } from '@/config/categories';

/**
 * Forma que tiene que tener cualquier borrador que devuelva un redactor de IA.
 * La comparten todos los proveedores: el pipeline valida la respuesta con esto
 * antes de seguir, así un borrador mal formado nunca avanza.
 */
const block = z.discriminatedUnion('type', [
  z.object({ type: z.literal('p'), text: z.string() }),
  z.object({ type: z.literal('h2'), text: z.string() }),
  z.object({ type: z.literal('list'), items: z.array(z.string()), ordered: z.boolean() }),
  z.object({ type: z.literal('facts'), confirmed: z.array(z.string()), unconfirmed: z.array(z.string()) }),
  z.object({ type: z.literal('note'), tone: z.enum(['disputed', 'context', 'update']), title: z.string(), text: z.string() }),
]);

export const draftSchema = z.object({
  title: z.string(),
  dek: z.string(),
  type: z.enum(['noticia', 'explicador', 'breve']),
  category: z.enum(categories.map((c) => c.slug) as [string, ...string[]]),
  tags: z.array(z.string()),
  body: z.array(block),
  seoDescription: z.string(),
  claims: z.array(
    z.object({
      text: z.string(),
      sourceIds: z.array(z.string()),
      status: z.enum(['confirmed', 'unconfirmed']),
    }),
  ),
});

export type DraftOutput = z.infer<typeof draftSchema>;

/**
 * JSON Schema del borrador para proveedores que lo piden en ese formato.
 * Gemini acepta un subconjunto de JSON Schema: no admite `const` (se convierte en
 * `enum` de un valor) ni la clave `$schema`.
 */
export function draftJsonSchema(): unknown {
  return sanitize(z.toJSONSchema(draftSchema));
}

function sanitize(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sanitize);
  if (!node || typeof node !== 'object') return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === '$schema') continue;
    if (key === 'const') {
      out.enum = [value];
      continue;
    }
    out[key] = sanitize(value);
  }
  return out;
}
