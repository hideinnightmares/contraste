import { categories } from '@/config/categories';
import { editorial } from '@/config/editorial';
import type { ArticleSummary } from './types';
import { byNewest } from './summary';
import { hoursBetween } from './dates';

/**
 * Composición de la portada.
 *
 * Cada nota recibe un puntaje = prioridad editorial × decaimiento por antigüedad
 * (con vida media según el formato). La portada se arma de arriba hacia abajo y
 * ninguna nota aparece dos veces: lo que ya se mostró arriba no se repite abajo.
 * Es determinista: mismas notas y misma hora producen la misma portada.
 */

export interface FrontPage {
  lead: ArticleSummary | null;
  secondary: ArticleSummary[];
  quick: ArticleSummary[];
  analysis: ArticleSummary[];
  latest: ArticleSummary[];
  sections: { slug: string; items: ArticleSummary[] }[];
  recommended: ArticleSummary[];
}

export function frontPageScore(article: ArticleSummary, now: Date): number {
  const age = Math.max(0, hoursBetween(article.publishedAt, now));
  const halfLife = editorial.frontPage.halfLifeHours[article.type];
  const decay = Math.pow(0.5, age / halfLife);
  // Un hecho en desarrollo conserva vigencia mientras se actualiza.
  const liveBoost = article.live ? 1.15 : 1;
  return article.priority * decay * liveBoost;
}

export function composeFrontPage(articles: ArticleSummary[], now: Date): FrontPage {
  const cfg = editorial.frontPage;
  const published = articles.filter((a) => new Date(a.publishedAt) <= now);
  const used = new Set<string>();
  const take = (a: ArticleSummary) => {
    used.add(a.id);
    return a;
  };
  const ranked = [...published].sort((a, b) => frontPageScore(b, now) - frontPageScore(a, now) || byNewest(a, b));

  // Principal: la noticia con más peso que tenga foto.
  const leadCandidate = ranked.find((a) => a.type === 'noticia' && a.image);
  const lead = leadCandidate ? take(leadCandidate) : null;

  // Secundarias: siguientes noticias con foto, sin repetir sección dentro del bloque superior.
  const topCategories = new Map<string, number>();
  if (lead) topCategories.set(lead.category, 1);
  const secondary: ArticleSummary[] = [];
  for (const a of ranked) {
    if (secondary.length >= cfg.secondaryCount) break;
    if (used.has(a.id) || a.type !== 'noticia' || !a.image) continue;
    if ((topCategories.get(a.category) ?? 0) >= cfg.maxPerCategoryInTop) continue;
    topCategories.set(a.category, (topCategories.get(a.category) ?? 0) + 1);
    secondary.push(take(a));
  }

  // Último momento: cronológico estricto, incluye lo ya mostrado (es otra lectura de lo mismo).
  const latest = [...published].sort(byNewest).slice(0, cfg.latestCount);

  const quick = [...published]
    .filter((a) => a.type === 'breve' && !used.has(a.id))
    .sort(byNewest)
    .slice(0, cfg.quickCount)
    .map(take);

  const analysis = ranked
    .filter((a) => (a.type === 'analisis' || a.type === 'explicador') && !used.has(a.id))
    .slice(0, cfg.analysisCount)
    .map(take);

  const sections = categories
    .filter((c) => c.showOnHome)
    .map((c) => ({
      slug: c.slug,
      items: ranked
        .filter((a) => a.category === c.slug && !used.has(a.id) && a.type !== 'breve')
        .slice(0, cfg.perSectionCount)
        .map(take),
    }))
    .filter((s) => s.items.length > 0);

  // Para leer con tiempo: las lecturas más largas que no entraron en ningún módulo, una por sección.
  const recommendedCategories = new Set<string>();
  const recommended: ArticleSummary[] = [];
  for (const a of [...ranked].sort((x, y) => y.readingMinutes - x.readingMinutes || byNewest(x, y))) {
    if (recommended.length >= cfg.recommendedCount) break;
    if (used.has(a.id) || a.type === 'breve' || recommendedCategories.has(a.category)) continue;
    recommendedCategories.add(a.category);
    recommended.push(take(a));
  }

  return { lead, secondary, quick, analysis, latest, sections, recommended };
}
