import { describe, expect, it } from 'vitest';
import { demoArticles } from '@/content/demo';
import type { Article } from '@/domain/types';
import { applyFields, contentChanged, fieldsFrom, parseTags, validationIssues, withCorrection, withStatus } from '@/app/redaccion/model';

const article = (): Article => structuredClone(demoArticles(new Date('2026-10-02T13:00:00Z')).find((a) => a.review.status === 'published')!);

describe('mesa de redacción', () => {
  it('abrir y guardar sin tocar nada no cambia la nota', () => {
    const original = article();
    const saved = applyFields(original, fieldsFrom(original));
    expect(contentChanged(original, saved)).toBe(false);
    expect(saved.seo.title).toBe(original.seo.title);
  });

  it('limpia los temas: sin vacíos ni repetidos, sin importar mayúsculas', () => {
    expect(parseTags(' Clima, La  Niña,, clima ,')).toEqual(['Clima', 'La Niña']);
  });

  it('el título para buscadores sigue al título cuando la redacción lo cambia', () => {
    const original = article();
    const saved = applyFields(original, { ...fieldsFrom(original), title: '  Un título nuevo  ' });
    expect(saved.title).toBe('Un título nuevo');
    expect(saved.seo.title).toBe('Un título nuevo');
    expect(contentChanged(original, saved)).toBe(true);
  });

  it('descarta las líneas vacías de listas y del bloque de lo que se sabe', () => {
    const original = article();
    const saved = applyFields(original, {
      ...fieldsFrom(original),
      body: [
        { type: 'list', items: ['Uno', '', '  Dos  '] },
        { type: 'facts', confirmed: ['Esto sí', ''], unconfirmed: ['', 'Esto no'] },
      ],
    });
    expect(saved.body).toEqual([
      { type: 'list', items: ['Uno', 'Dos'] },
      { type: 'facts', confirmed: ['Esto sí'], unconfirmed: ['Esto no'] },
    ]);
  });

  it('cambiar el estado o sumar una corrección no cuenta como cambio de contenido', () => {
    const original = article();
    const corrected = withCorrection(withStatus(original, 'in_review'), '  Corregimos una cifra.  ', new Date('2026-10-02T15:00:00Z'));
    expect(contentChanged(original, corrected)).toBe(false);
    expect(corrected.updates.at(-1)).toEqual({ at: '2026-10-02T15:00:00.000Z', text: 'Corregimos una cifra.' });
    expect(original.updates).not.toBe(corrected.updates);
  });

  it('explica los problemas con nombres de campo en castellano', () => {
    const original = article();
    const issues = validationIssues(applyFields(original, { ...fieldsFrom(original), title: '', seoDescription: 'x'.repeat(200) }));
    const fields = issues.map((i) => i.field);
    expect(fields).toContain('Título');
    expect(fields).toContain('Descripción para buscadores');
    expect(issues.find((i) => i.field === 'Descripción para buscadores' && i.message.includes('200'))).toBeDefined();
  });

  it('una nota válida no tiene problemas', () => {
    const original = article();
    expect(validationIssues(applyFields(original, fieldsFrom(original)))).toEqual([]);
  });
});
