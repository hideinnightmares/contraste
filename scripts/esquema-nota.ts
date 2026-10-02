/**
 * Genera supabase/esquema-nota.json: el esquema de una nota (src/domain/schema.ts) en
 * formato JSON Schema, para que la base valide cada documento con pg_jsonschema.
 *
 *   npx tsx scripts/esquema-nota.ts
 *
 * Si cambia `articleSchema`, hay que regenerarlo y crear una migración que reemplace la
 * restricción `articles_documento_valido`. El test tests/unit/esquema-nota.test.ts avisa
 * cuando el archivo quedó desactualizado.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { notaJsonSchema } from '../src/domain/schema-json';

const file = path.join(process.cwd(), 'supabase', 'esquema-nota.json');
writeFileSync(file, `${JSON.stringify(notaJsonSchema())}\n`, 'utf8');
console.log(`Esquema de la nota escrito en ${path.relative(process.cwd(), file)}.`);
