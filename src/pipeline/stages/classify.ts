import { categories } from '@/config/categories';
import type { StoryCluster } from '../types';
import { stems } from '../text';

/**
 * Clasificador por palabras clave, a partir de `config/categories.ts`.
 * Devuelve la sección con más coincidencias o `null` si ninguna aplica (en ese
 * caso, la redacción elige). Puede reemplazarse por el redactor de IA, que
 * también propone sección, pero esta versión es determinista y auditable.
 */
export function classifyCluster(cluster: StoryCluster): { category: string | null; scores: Record<string, number> } {
  const text = cluster.items.map((i) => `${i.title} ${i.title} ${i.summary}`).join(' ');
  const tokens = stems(text);
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);

  const scores: Record<string, number> = {};
  for (const c of categories) {
    let score = 0;
    for (const kw of c.keywords) {
      const kwStems = stems(kw);
      if (kwStems.length === 0) continue;
      // Palabra clave de varias palabras: cuenta si están todas.
      const hits = Math.min(...kwStems.map((s) => counts.get(s) ?? 0));
      score += hits * kwStems.length;
    }
    scores[c.slug] = score;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return { category: best && best[1] > 0 ? best[0] : null, scores };
}
