import { describe, expect, it } from 'vitest';
import { demoArticles } from '@/content/demo';
import { buildIndex, highlight, parseSearchQuery, search, toSearchDocument } from '@/domain/search';

const NOW = new Date('2026-10-01T13:25:00Z');
const index = buildIndex(demoArticles(NOW).map(toSearchDocument));

describe('buscador', () => {
  it('encuentra por título sin importar tildes ni mayúsculas', () => {
    const r = search(index, { q: 'CANASTA basica' });
    expect(r.total).toBeGreaterThan(0);
    expect(r.hits[0].article.slug).toBe('precios-canasta-basica-relevamiento-septiembre');
  });

  it('busca en el cuerpo de la nota', () => {
    const r = search(index, { q: 'densidad edilicia' });
    expect(r.hits.map((h) => h.article.slug)).toContain('ciudades-planes-calor-extremo-verano');
  });

  it('acepta prefijo en la última palabra (búsqueda instantánea)', () => {
    const r = search(index, { q: 'cuot' });
    expect(r.hits.map((h) => h.article.slug)).toContain('cuotas-sin-interes-que-se-sabe');
  });

  it('exige todas las palabras (AND)', () => {
    expect(search(index, { q: 'rana dólar' }).total).toBe(0);
  });

  it('filtra por sección, formato y etiqueta', () => {
    const bySection = search(index, { category: 'ciencia' });
    expect(bySection.total).toBeGreaterThan(0);
    expect(bySection.hits.every((h) => h.article.category === 'ciencia')).toBe(true);

    const byType = search(index, { type: 'explicador' });
    expect(byType.hits.every((h) => h.article.type === 'explicador')).toBe(true);

    const byTag = search(index, { tag: 'transporte' });
    expect(byTag.total).toBeGreaterThan(0);
  });

  it('filtra por rango de fechas en hora de Buenos Aires', () => {
    const all = search(index, { pageSize: 50 }).total;
    const today = search(index, { from: '2026-10-01', to: '2026-10-01', pageSize: 50 });
    expect(today.total).toBeGreaterThan(0);
    expect(today.total).toBeLessThan(all);
    expect(search(index, { from: '2030-01-01' }).total).toBe(0);
  });

  it('sin consulta ordena por fecha, de lo más nuevo a lo más viejo', () => {
    const r = search(index, { pageSize: 50 });
    const dates = r.hits.map((h) => new Date(h.article.publishedAt).getTime());
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
  });

  it('pagina resultados', () => {
    const p1 = search(index, { pageSize: 5, page: 1 });
    const p2 = search(index, { pageSize: 5, page: 2 });
    expect(p1.hits).toHaveLength(5);
    expect(p2.hits[0].article.id).not.toBe(p1.hits[0].article.id);
  });

  it('marca coincidencias con rangos sobre el texto original', () => {
    const h = highlight('Economía y política', ['economia']);
    expect(h.ranges).toEqual([[0, 8]]);
    expect(h.text.slice(...h.ranges[0])).toBe('Economía');
  });

  it('valida y limpia los parámetros de la URL', () => {
    const q = parseSearchQuery({ q: '  rana ', seccion: 'inexistente', formato: 'opinion', desde: '01-10-2026', pagina: '-3' });
    expect(q).toMatchObject({ q: 'rana', category: undefined, type: undefined, from: undefined, page: 1 });
    expect(parseSearchQuery({ seccion: 'ciencia', desde: '2026-10-01' })).toMatchObject({ category: 'ciencia', from: '2026-10-01' });
  });
});
