import { describe, expect, it } from 'vitest';
import { demoArticles } from '@/content/demo';
import { composeFrontPage, frontPageScore } from '@/domain/curation';
import { toSummary } from '@/domain/summary';
import type { ArticleSummary } from '@/domain/types';

const NOW = new Date('2026-10-01T13:25:00Z');
const summaries = demoArticles(NOW).map(toSummary);

describe('portada', () => {
  const front = composeFrontPage(summaries, NOW);

  it('la principal es una noticia con foto y de máxima prioridad', () => {
    expect(front.lead).not.toBeNull();
    expect(front.lead!.type).toBe('noticia');
    expect(front.lead!.image).not.toBeNull();
    expect(front.lead!.slug).toBe('ciudades-planes-calor-extremo-verano');
  });

  it('no repite notas entre módulos (salvo Último momento, que es cronológico)', () => {
    const placed = [
      front.lead!,
      ...front.secondary,
      ...front.quick,
      ...front.analysis,
      ...front.recommended,
      ...front.sections.flatMap((s) => s.items),
    ].map((a) => a.id);
    expect(new Set(placed).size).toBe(placed.length);
  });

  it('las secundarias no repiten sección entre sí ni con la principal', () => {
    const cats = [front.lead!, ...front.secondary].map((a) => a.category);
    expect(new Set(cats).size).toBe(cats.length);
  });

  it('Último momento está en orden cronológico estricto', () => {
    const times = front.latest.map((a) => new Date(a.publishedAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it('"En breve" solo tiene breves y análisis solo análisis o explicadores', () => {
    expect(front.quick.every((a) => a.type === 'breve')).toBe(true);
    expect(front.analysis.every((a) => a.type === 'analisis' || a.type === 'explicador')).toBe(true);
  });

  it('ignora notas programadas para el futuro', () => {
    const future: ArticleSummary = { ...summaries[0], id: 'futura', slug: 'futura', priority: 5, publishedAt: '2026-10-02T12:00:00Z' };
    const f = composeFrontPage([future, ...summaries], NOW);
    expect(f.lead!.id).not.toBe('futura');
    expect(f.latest.some((a) => a.id === 'futura')).toBe(false);
  });

  it('una nota pierde peso con el tiempo según su formato', () => {
    const base = summaries.find((a) => a.type === 'noticia')!;
    const fresh = frontPageScore({ ...base, publishedAt: NOW.toISOString(), live: false }, NOW);
    const old = frontPageScore({ ...base, publishedAt: new Date(NOW.getTime() - 20 * 3_600_000).toISOString(), live: false }, NOW);
    expect(old).toBeLessThan(fresh / 3);
  });
});
