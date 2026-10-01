import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { demoArticles } from '@/content/demo';
import { articleSchema } from '@/domain/schema';
import { categories } from '@/config/categories';
import { DemoArticleRepository } from '@/data/demo-repository';

const NOW = new Date('2026-10-01T13:25:00Z');
const articles = demoArticles(NOW);

describe('dataset DEMO', () => {
  it('todas las notas pasan el esquema editorial', () => {
    for (const a of articles) {
      const result = articleSchema.safeParse(a);
      expect(result.success, `${a.slug}: ${JSON.stringify(!result.success && result.error.issues)}`).toBe(true);
    }
  });

  it('todas están marcadas como DEMO, con fuentes ficticias en example.com', () => {
    for (const a of articles) {
      expect(a.isDemo).toBe(true);
      for (const s of a.sources) {
        expect(s.isDemo).toBe(true);
        expect(s.name).toMatch(/\(demo\)$/);
        expect(s.url).toMatch(/^https:\/\/example\.com\//);
      }
    }
  });

  it('no usa autores humanos inventados', () => {
    for (const a of articles) {
      expect(a.byline.kind).toBe('automated_desk');
    }
  });

  it('tiene slugs únicos y cubre todas las secciones', () => {
    expect(new Set(articles.map((a) => a.slug)).size).toBe(articles.length);
    for (const c of categories) {
      expect(articles.some((a) => a.category === c.slug), c.slug).toBe(true);
    }
  });

  it('cada foto existe en public/, es ilustrativa y tiene autor y licencia', () => {
    for (const a of articles.filter((x) => x.image)) {
      const img = a.image!;
      expect(existsSync(path.join(process.cwd(), 'public', img.src)), img.src).toBe(true);
      expect(img.illustrative).toBe(true);
      expect(img.credit.author.length).toBeGreaterThan(1);
      expect(img.credit.license).toMatch(/CC|Public domain/);
      expect(img.alt.length).toBeGreaterThan(20);
    }
  });

  it('las notas en disputa explican la contradicción en el texto', () => {
    const disputed = articles.filter((a) => a.verification.status === 'disputed');
    expect(disputed.length).toBeGreaterThan(0);
    for (const a of disputed) {
      expect(a.verification.contradictions.length).toBeGreaterThan(0);
      expect(a.body.some((b) => b.type === 'note' && b.tone === 'disputed')).toBe(true);
      expect(a.review.approvedBy).toBe('human');
    }
  });

  it('cuenta las réplicas de un mismo cable como una sola fuente independiente', () => {
    const withReplica = articles.find((a) => a.sources.some((s) => s.id.endsWith('--replica-agencia')))!;
    expect(withReplica.sources.length).toBe(4);
    expect(withReplica.verification.independentSources).toBe(3);
  });

  it('el repositorio no devuelve notas con fecha futura', async () => {
    const repo = new DemoArticleRepository(() => NOW);
    const all = await repo.listAllPublished();
    expect(all.every((a) => new Date(a.publishedAt) <= NOW)).toBe(true);
    expect(all.length).toBe(articles.length);
  });

  it('el repositorio pagina y filtra por sección y etiqueta', async () => {
    const repo = new DemoArticleRepository(() => NOW);
    const page = await repo.listPublished({ category: 'economia', pageSize: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBeGreaterThan(2);
    expect(page.items.every((a) => a.category === 'economia')).toBe(true);
    const tagged = await repo.listPublished({ tagSlug: 'transporte' });
    expect(tagged.items.length).toBeGreaterThan(0);
    expect(tagged.items.every((a) => a.tags.some((t) => t.toLowerCase() === 'transporte'))).toBe(true);
  });

  it('anterior y siguiente quedan dentro de la misma sección', async () => {
    const repo = new DemoArticleRepository(() => NOW);
    const { previous, next } = await repo.getAdjacent('colectivos-nuevas-frecuencias-nocturnas');
    for (const a of [previous, next].filter(Boolean)) expect(a!.category).toBe('sociedad');
  });
});
