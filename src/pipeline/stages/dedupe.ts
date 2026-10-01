import { editorial } from '@/config/editorial';
import type { SourceItem, StoryCluster } from '../types';
import { jaccard, overlapCoefficient, stemSet } from '../text';

/**
 * Deduplicación: agrupa los ítems que cuentan el mismo hecho.
 *
 * Dos ítems son el mismo hecho si comparten la URL canónica, o si sus títulos
 * se superponen lo suficiente (coeficiente de superposición sobre raíces, con al
 * menos tres raíces en común) dentro de la ventana de tiempo configurada. Se usa
 * enlace simple: si A≈B y B≈C, los tres quedan en el mismo grupo.
 */
export function clusterItems(items: SourceItem[]): StoryCluster[] {
  const { titleSimilarity, windowHours } = editorial.dedupe;
  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };

  const titles = items.map((it) => stemSet(it.title));
  const texts = items.map((it) => stemSet(`${it.title} ${it.summary}`));

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const hours = Math.abs(new Date(items[i].publishedAt).getTime() - new Date(items[j].publishedAt).getTime()) / 3_600_000;
      if (hours > windowHours) continue;
      if (items[i].url === items[j].url) {
        union(i, j);
        continue;
      }
      const t = overlapCoefficient(titles[i], titles[j]);
      const sameTitle = t.shared >= 3 && t.score >= titleSimilarity + 0.15;
      const sameStory = t.shared >= 2 && jaccard(texts[i], texts[j]) >= titleSimilarity * 0.6;
      if (sameTitle || sameStory) union(i, j);
    }
  }

  const groups = new Map<number, SourceItem[]>();
  items.forEach((it, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), it]));

  return [...groups.values()].map((group) => {
    const sorted = [...group].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
    const primary =
      group.find((g) => g.sourceKind === 'official' || g.sourceKind === 'public_document') ??
      group.find((g) => g.sourceKind === 'news_agency') ??
      [...group].sort((a, b) => b.title.length - a.title.length)[0];
    return {
      id: `cluster-${hashString(sorted.map((s) => s.id).join('|'))}`,
      items: sorted,
      headline: primary.title,
      firstSeenAt: sorted[0].publishedAt,
      lastSeenAt: sorted[sorted.length - 1].publishedAt,
    };
  });
}

/** Hash corto y estable (FNV-1a) para identificar grupos entre corridas. */
export function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
