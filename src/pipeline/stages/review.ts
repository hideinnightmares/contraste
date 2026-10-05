import { editorial } from '@/config/editorial';
import { confidenceLabel } from '@/domain/labels';
import { bodyWordCount } from '@/domain/text';
import type { Confidence } from '@/domain/types';
import type { DraftArticle, GroundingReport, ReviewDecision, VerificationReport } from '../types';

const confidenceRank: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };
const typeName = { noticia: 'una noticia', analisis: 'un análisis', explicador: 'un explicador', breve: 'una breve' } as const;

/**
 * Política de revisión. Decide si un borrador puede publicarse solo, si necesita
 * una persona o si hay que esperar más fuentes. Todas las razones quedan
 * registradas para auditar cada decisión.
 */
export function decideReview(input: {
  verification: VerificationReport;
  category: string | null;
  draft: DraftArticle | null;
  grounding: GroundingReport | null;
  config?: typeof editorial.review;
}): ReviewDecision {
  const cfg = input.config ?? editorial.review;
  const { verification: v, draft, grounding } = input;
  const rules = cfg.autoPublish;

  if (v.status === 'unverified') {
    return { decision: 'hold', reasons: ['Una sola fuente independiente: se espera confirmación antes de redactar.', ...v.reasons] };
  }

  const blockers: string[] = [];
  if (!draft) blockers.push('Todavía no hay borrador.');
  if (draft) {
    const words = bodyWordCount(draft.body);
    const min = editorial.drafting.words[draft.type].min;
    if (words < min) blockers.push(`La nota tiene ${words} palabras; para ${typeName[draft.type]} se piden al menos ${min}.`);
  }
  if (v.contradictions.length > 0 && !rules.allowContradictions) blockers.push('Las fuentes se contradicen.');
  if (v.independentSources < rules.minIndependentSources) {
    blockers.push(`Hay ${v.independentSources} fuentes independientes; se exigen ${rules.minIndependentSources}.`);
  }
  if (confidenceRank[v.confidence] < confidenceRank[rules.minConfidence]) blockers.push(`${confidenceLabel[v.confidence]}, por debajo de la exigida.`);
  if (grounding && !grounding.ok) {
    if (grounding.ungroundedFigures.length) blockers.push(`Cifras sin respaldo en las fuentes: ${grounding.ungroundedFigures.join(', ')}.`);
    if (grounding.ungroundedNames.length) blockers.push(`Nombres sin respaldo en las fuentes: ${grounding.ungroundedNames.join(', ')}.`);
    if (grounding.unknownSourceIds.length) blockers.push('El borrador cita fuentes que no estaban en la investigación.');
    if (grounding.contradictoryFacts.length) {
      blockers.push(`El borrador da el mismo dato como confirmado y como no confirmado: ${grounding.contradictoryFacts.join(' / ')}`);
    }
  }
  if (!input.category) blockers.push('No se pudo asignar sección.');
  if (input.category && (rules.alwaysHumanReview as readonly string[]).includes(input.category)) {
    blockers.push(`La sección "${input.category}" siempre requiere revisión humana.`);
  }

  if (cfg.mode === 'human') {
    return { decision: 'human_review', reasons: ['La configuración exige revisión humana para todo borrador.', ...blockers] };
  }
  if (blockers.length > 0) return { decision: 'human_review', reasons: blockers };
  return { decision: 'auto_publish', reasons: ['Cumple todas las condiciones de publicación automática.', ...v.reasons] };
}
