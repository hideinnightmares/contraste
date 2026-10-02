import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { notaJsonSchema } from '@/domain/schema-json';

const root = process.cwd();

describe('esquema de la nota en la base', () => {
  it('supabase/esquema-nota.json coincide con articleSchema (si falla: npx tsx scripts/esquema-nota.ts y una migración nueva)', () => {
    const saved = readFileSync(path.join(root, 'supabase', 'esquema-nota.json'), 'utf8').trim();
    expect(saved).toBe(JSON.stringify(notaJsonSchema()));
  });

  it('la última migración que define la restricción usa ese mismo esquema', () => {
    const saved = readFileSync(path.join(root, 'supabase', 'esquema-nota.json'), 'utf8').trim();
    const dir = path.join(root, 'supabase', 'migrations');
    const withConstraint = readdirSync(dir)
      .sort()
      .map((f) => readFileSync(path.join(dir, f), 'utf8'))
      .filter((sql) => sql.includes('articles_documento_valido'));
    expect(withConstraint.length).toBeGreaterThan(0);
    expect(withConstraint.at(-1)).toContain(`$json$${saved}$json$`);
  });
});
