import { describe, expect, it } from 'vitest';
import { demoArticles } from '@/content/demo';
import type { Article } from '@/domain/types';
import {
  applyFields,
  contentChanged,
  fieldsFrom,
  parseTags,
  shownOnSite,
  validationIssues,
  whenVisible,
  withCorrection,
  withStatus,
} from '@/app/redaccion/model';

const NOW = new Date('2026-10-02T13:00:00Z');
const article = (): Article => structuredClone(demoArticles(NOW).find((a) => a.review.status === 'published')!);

/** Una nota en disputa tal como la deja el pipeline: en revisión, sin aprobar. */
function disputedDraft(): Article {
  const a = structuredClone(demoArticles(NOW).find((x) => x.verification.status === 'disputed')!);
  return { ...a, review: { status: 'in_review', approvedBy: null, reviewedAt: null, notes: 'Las fuentes se contradicen.' } };
}

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
    const corrected = withCorrection(withStatus(original, 'in_review', NOW), '  Corregimos una cifra.  ', new Date('2026-10-02T15:00:00Z'));
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

  it('publicar desde la mesa firma como persona: una nota en disputa se puede publicar', () => {
    const draft = disputedDraft();
    // Sin la firma, el esquema no deja publicar lo que está en disputa.
    expect(validationIssues({ ...draft, review: { ...draft.review, status: 'published' } }).map((i) => i.field)).toContain('Nota');
    const published = withStatus(draft, 'published', NOW);
    expect(published.review).toEqual({ status: 'published', approvedBy: 'human', reviewedAt: NOW.toISOString(), notes: 'Las fuentes se contradicen.' });
    expect(validationIssues(published)).toEqual([]);
  });

  it('descartar deja la fecha y volver a revisión borra la aprobación anterior', () => {
    const published = withStatus(disputedDraft(), 'published', NOW);
    expect(withStatus(published, 'rejected', NOW).review).toMatchObject({ status: 'rejected', approvedBy: null, reviewedAt: NOW.toISOString() });
    expect(withStatus(published, 'in_review', NOW).review).toMatchObject({ status: 'in_review', approvedBy: null, reviewedAt: null });
  });

  it('el orden de las claves no cuenta como cambio', () => {
    const original = article();
    const reordered = { ...original, seo: Object.fromEntries(Object.entries(original.seo).reverse()) };
    expect(contentChanged(original, reordered)).toBe(false);
  });

  it('dice cuándo se va a ver el cambio según cómo se arma el sitio', () => {
    const real = { ...article(), isDemo: false };
    const demo = { ...article(), isDemo: true };
    expect(whenVisible(real, { readsDatabase: false, demoMode: true })).toMatch(/cuando pase a contenido real/);
    expect(whenVisible(real, { readsDatabase: true, demoMode: false })).toMatch(/en unos minutos/);
    expect(whenVisible(demo, { readsDatabase: true, demoMode: true })).toMatch(/en el próximo/);
    expect(whenVisible(demo, { readsDatabase: true, demoMode: false })).toMatch(/no la muestra/);
    expect(shownOnSite(demo, { readsDatabase: true, demoMode: false })).toBe(false);
    expect(shownOnSite(real, { readsDatabase: true, demoMode: false })).toBe(true);
  });
});
