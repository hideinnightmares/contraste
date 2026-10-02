import type { ResearchBrief, StoryCluster, VerificationReport } from '../types';

/**
 * Investigación: arma el dossier que recibe el redactor.
 *
 * Hoy usa el texto que trajeron los conectores (título, resumen y contenido si
 * el feed lo incluye). El punto de extensión natural es un `ArticleFetcher` que
 * descargue el texto completo de cada fuente (respetando robots.txt y las
 * condiciones de uso de cada sitio) y busque fuentes primarias adicionales.
 */
export interface ArticleFetcher {
  fetchText(url: string): Promise<string | null>;
}

export async function buildBrief(
  cluster: StoryCluster,
  verification: VerificationReport,
  category: string | null,
  fetcher?: ArticleFetcher,
): Promise<ResearchBrief> {
  const sources = await Promise.all(
    cluster.items
      .filter((it) => !it.discoveryOnly)
      .map(async (it) => {
        const full = fetcher ? await fetcher.fetchText(it.url).catch(() => null) : null;
        return {
          id: it.id,
          name: it.sourceName,
          kind: it.sourceKind,
          url: it.url,
          publishedAt: it.publishedAt,
          text: [it.title, it.summary, full ?? it.content ?? ''].filter(Boolean).join('\n'),
          isDemo: it.isDemo,
        };
      }),
  );
  return { clusterId: cluster.id, headline: cluster.headline, category, sources, verification };
}
