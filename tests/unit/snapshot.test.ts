import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { demoArticles } from '@/content/demo';
import { mergeSnapshot, SNAPSHOT_VERSION, staleIds, type SnapshotRow } from '@/data/snapshot';
import { SnapshotArticleRepository } from '@/data/snapshot-repository';
import { RepositoryError } from '@/data/repository';
import type { Article } from '@/domain/types';

const NOW = new Date('2026-10-01T13:00:00Z');
const row = (id: string, updatedAt: string, document = {} as Article): SnapshotRow => ({ id, updatedAt, document });

function writeSnapshot(rows: SnapshotRow[]): string {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'contraste-')), 'notas.json');
  writeFileSync(file, JSON.stringify({ version: SNAPSHOT_VERSION, syncedAt: NOW.toISOString(), rows }));
  return file;
}

describe('foto de la base', () => {
  it('descarga solo lo nuevo o lo que cambió', () => {
    const previous = [row('a', '1'), row('b', '1'), row('c', '1')];
    const index = [
      { id: 'a', updatedAt: '1' },
      { id: 'b', updatedAt: '2' },
      { id: 'd', updatedAt: '1' },
    ];
    expect(staleIds(previous, index)).toEqual(['b', 'd']);
  });

  it('combina: reutiliza lo que no cambió, toma lo descargado y quita lo despublicado', () => {
    const previous = [row('a', '1'), row('b', '1'), row('c', '1')];
    const index = [
      { id: 'a', updatedAt: '1' },
      { id: 'b', updatedAt: '2' },
      { id: 'd', updatedAt: '1' },
    ];
    const merged = mergeSnapshot(previous, index, [row('b', '2'), row('d', '1')]);
    expect(merged.map((r) => `${r.id}@${r.updatedAt}`)).toEqual(['a@1', 'b@2', 'd@1']);
  });

  it('nunca arma una foto con una nota vieja: si falta descargar algo, falla', () => {
    expect(() => mergeSnapshot([row('a', '1')], [{ id: 'a', updatedAt: '2' }], [])).toThrow(/Falta descargar la nota a/);
  });
});

describe('repositorio sobre la foto', () => {
  const real = demoArticles(NOW)
    .slice(0, 3)
    .map((a) => ({ ...a, isDemo: false, sources: a.sources.map((s) => ({ ...s, isDemo: false })) }));
  const demo = demoArticles(NOW)[3];

  it('usa el id de la fila y, con contenido real, no muestra notas de demostración', async () => {
    const file = writeSnapshot([...real.map((a, i) => row(`fila-${i}`, '1', a)), row('fila-demo', '1', demo)]);
    const repo = new SnapshotArticleRepository(() => NOW, { demoMode: false, file });
    const all = await repo.listAllPublished();
    expect(all).toHaveLength(3);
    expect(all.every((a) => a.id.startsWith('fila-') && !a.isDemo)).toBe(true);

    const withDemo = new SnapshotArticleRepository(() => NOW, { demoMode: true, file });
    expect(await withDemo.listAllPublished()).toHaveLength(4);
  });

  it('una nota con fecha futura no aparece hasta que llega su hora', async () => {
    const future = { ...real[0], publishedAt: '2099-01-01T00:00:00.000Z', updatedAt: '2099-01-01T00:00:00.000Z' };
    const file = writeSnapshot([row('futura', '1', future)]);
    expect(await new SnapshotArticleRepository(() => NOW, { demoMode: false, file }).listAllPublished()).toEqual([]);
  });

  it('sin notas, el sitio se arma igual (lista vacía)', async () => {
    const file = writeSnapshot([]);
    const repo = new SnapshotArticleRepository(() => NOW, { demoMode: false, file });
    expect(await repo.listAllPublished()).toEqual([]);
    expect(await repo.listTags()).toEqual([]);
  });

  it('una nota inválida corta el armado con un mensaje claro', async () => {
    const broken = { ...real[0], sources: [] };
    const file = writeSnapshot([row('rota', '1', broken)]);
    const repo = new SnapshotArticleRepository(() => NOW, { demoMode: false, file });
    await expect(repo.listAllPublished()).rejects.toThrow(/La base de datos tiene notas inválidas/);
  });

  it('sin foto descargada, avisa cómo descargarla', async () => {
    const repo = new SnapshotArticleRepository(() => NOW, { demoMode: false, file: path.join(tmpdir(), 'no-existe-contraste.json') });
    await expect(repo.listAllPublished()).rejects.toThrow(RepositoryError);
    await expect(repo.listAllPublished()).rejects.toThrow(/npm run content:sync/);
  });
});
