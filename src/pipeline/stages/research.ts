import type { ResearchBrief, StoryCluster, VerificationReport } from '../types';

/**
 * Investigación: arma el dossier que recibe el redactor.
 *
 * Cada fuente aporta su título y resumen del feed y, si se pudo leer, el texto completo de la
 * nota (`WebArticleFetcher`, sources/article.ts: respeta robots.txt, muros de pago y la marca
 * `noai`). El texto completo se usa solo para redactar y verificar: no se guarda.
 */
export interface ArticleFetcher {
  fetchText(url: string): Promise<string | null>;
}

/**
 * Texto completo de las fuentes del grupo que se pudieron leer, por id de ítem. Los
 * agregadores y las fuentes de prueba no se leen: unos no son fuente y las otras son ficticias.
 */
export async function readFullTexts(cluster: StoryCluster, fetcher: ArticleFetcher): Promise<Map<string, string>> {
  const readable = cluster.items.filter((it) => !it.discoveryOnly && !it.isDemo && /^https?:\/\//.test(it.url));
  const texts = await Promise.all(readable.map(async (it) => [it.id, await fetcher.fetchText(it.url).catch(() => null)] as const));
  return new Map(texts.filter((entry): entry is readonly [string, string] => Boolean(entry[1])));
}

export function buildBrief(
  cluster: StoryCluster,
  verification: VerificationReport,
  category: string | null,
  fullTexts: Map<string, string> = new Map(),
): ResearchBrief {
  const sources = cluster.items
    .filter((it) => !it.discoveryOnly)
    .map((it) => ({
      id: it.id,
      name: it.sourceName,
      kind: it.sourceKind,
      url: it.url,
      publishedAt: it.publishedAt,
      text: [it.title, it.summary, fullTexts.get(it.id) ?? it.content ?? ''].filter(Boolean).join('\n'),
      isDemo: it.isDemo,
    }));
  return { clusterId: cluster.id, headline: cluster.headline, category, sources, verification };
}
