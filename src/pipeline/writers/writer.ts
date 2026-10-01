import { categories } from '@/config/categories';
import type { DraftArticle, ResearchBrief } from '../types';

/**
 * Redactor de borradores. La implementación con IA vive en `anthropic.ts`; se
 * puede agregar otra (otro proveedor, un equipo humano vía CMS) sin tocar el
 * pipeline. Todo lo que devuelve un redactor es un BORRADOR.
 */
export interface ArticleWriter {
  readonly name: string;
  write(brief: ResearchBrief): Promise<DraftArticle>;
}

export class WriterError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'WriterError';
  }
}

/** Instrucciones editoriales fijas (estables, para que el prefijo se pueda cachear). */
export const WRITER_SYSTEM_PROMPT = `Sos redactor de Contraste, un diario digital argentino. Escribís en español rioplatense neutro, con registro periodístico sobrio.

Tu tarea es redactar un BORRADOR de nota original a partir de un dossier de fuentes ya contrastadas. Una persona de la redacción lo va a revisar.

Reglas que no se negocian:
- Usá únicamente información presente en las fuentes del dossier. No agregues datos, nombres, cifras, fechas, citas textuales ni contexto que no esté en ellas, aunque lo sepas.
- No copies frases de las fuentes: redactá con tus palabras. No uses comillas para atribuir dichos que no figuren textualmente en una fuente.
- Si las fuentes se contradicen (el dossier lo indica), no elijas una versión: decí que difieren y qué dice cada una, en un bloque de tipo "note" con tono "disputed".
- Lo que una fuente presenta en condicional o como no confirmado va en "unconfirmed" del bloque "facts", nunca como hecho.
- Cada dato va en una sola lista del bloque "facts", nunca en las dos. Si una fuente lo afirma y otra lo da en condicional, va en "confirmed" y en "claims" solo con la fuente que lo afirma.
- Diferenciá hechos de interpretación. No opines.
- Título informativo, sin clickbait, sin signos de exclamación, sin adjetivos sensacionalistas, de hasta 110 caracteres.
- Bajada de una o dos oraciones que agregue información, no que repita el título.
- Cada afirmación relevante va en "claims" con los ids de las fuentes que la respaldan (solo ids del dossier).
- La sección tiene que ser una de: ${categories.map((c) => c.slug).join(', ')}.`;

/** Dossier para el redactor: fuentes, estado de verificación y contradicciones. */
export function renderBrief(brief: ResearchBrief): string {
  const v = brief.verification;
  const sources = brief.sources
    .map((s) => `<fuente id="${s.id}" tipo="${s.kind}" nombre="${s.name}" publicada="${s.publishedAt}">\n${s.text}\n</fuente>`)
    .join('\n');
  const contradictions = v.contradictions.length
    ? v.contradictions.map((c) => `- ${c.topic}: ${c.detail}`).join('\n')
    : 'Ninguna detectada.';
  return `<dossier>
<tema>${brief.headline}</tema>
<seccion_sugerida>${brief.category ?? 'sin asignar'}</seccion_sugerida>
<verificacion estado="${v.status}" confianza="${v.confidence}" fuentes_independientes="${v.independentSources}">
${v.reasons.join('\n')}
</verificacion>
<contradicciones>
${contradictions}
</contradicciones>
${sources}
</dossier>

Redactá el borrador siguiendo las reglas.`;
}
