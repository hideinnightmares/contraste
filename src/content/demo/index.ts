import type { Article } from '@/domain/types';
import { buildDemoArticle, demoAnchor, type DemoSpec } from './builder';
import { politica } from './articles/politica';
import { economia } from './articles/economia';
import { mundo } from './articles/mundo';
import { tecnologia } from './articles/tecnologia';
import { ciencia } from './articles/ciencia';
import { cultura } from './articles/cultura';
import { deportes } from './articles/deportes';
import { sociedad } from './articles/sociedad';
import { negocios } from './articles/negocios';
import { tendencias } from './articles/tendencias';

export const demoSpecs: DemoSpec[] = [
  ...politica,
  ...economia,
  ...mundo,
  ...tecnologia,
  ...ciencia,
  ...cultura,
  ...deportes,
  ...sociedad,
  ...negocios,
  ...tendencias,
];

/** Notas DEMO con fechas relativas a la hora actual (o a `now`, en tests). */
export function demoArticles(now: Date = new Date()): Article[] {
  const anchor = demoAnchor(now);
  return demoSpecs.map((spec) => buildDemoArticle(spec, anchor));
}

/**
 * "Más leídas" de demostración. No hay medición de audiencia instalada, así que
 * esta lista la eligió la redacción a mano y la interfaz lo aclara. Con analytics
 * real, la reemplaza un proveedor que devuelva los slugs más leídos.
 */
export const demoMostReadSlugs = [
  'ciudades-planes-calor-extremo-verano',
  'estafas-mensajeria-como-reconocerlas',
  'cuotas-sin-interes-que-se-sabe',
  'investigadores-describen-posible-nueva-especie-rana',
  'final-copa-regional-definicion-penales',
];
