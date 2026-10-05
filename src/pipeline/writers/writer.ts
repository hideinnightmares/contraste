import { categories } from '@/config/categories';
import { editorial } from '@/config/editorial';
import type { DraftArticle, ResearchBrief } from '../types';

/** Extensión por formato (config/editorial.ts), para las instrucciones del redactor. */
const words = editorial.drafting.words;

/**
 * Redactor de borradores. La implementación con IA vive en `anthropic.ts`; se
 * puede agregar otra (otro proveedor, un equipo humano vía CMS) sin tocar el
 * pipeline. Todo lo que devuelve un redactor es un BORRADOR.
 */
export interface ArticleWriter {
  readonly name: string;
  /**
   * Robots del proveedor de IA cuyas prohibiciones se respetan antes de mandarle el texto
   * completo de una nota (`WebArticleFetcher`). Lo declara un redactor cuyo proveedor usa lo que
   * recibe para entrenar sus modelos: un sitio que se lo prohíbe no quiere que su texto llegue ahí.
   */
  readonly optOutAgents?: string[];
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
- Atribuí en el texto cada dato a la fuente que lo aporta, por su nombre (el atributo "nombre" del dossier): "según el INDEC", "informó Infobae", "de acuerdo con el Boletín Oficial". Lo que confirman varias fuentes podés darlo como hecho y nombrar la principal.
- Si el dossier tiene fuentes oficiales o documentos públicos (tipo "official" o "public_document"), basá la nota en ellas y nombralas primero; los medios confirman o agregan contexto.
- Una acusación, imputación o cualquier dato que afecte la reputación de una persona identificable va siempre atribuido a quien lo afirma y, si no está confirmado, en condicional.
- Si las fuentes se contradicen (el dossier lo indica), no elijas una versión: decí que difieren y qué dice cada una, en un bloque de tipo "note" con tono "disputed".
- Lo que una fuente presenta en condicional o como no confirmado va en "unconfirmed" del bloque "facts", nunca como hecho.
- Cada dato va en una sola lista del bloque "facts", nunca en las dos. Si una fuente lo afirma y otra lo da en condicional, va en "confirmed" y en "claims" solo con la fuente que lo afirma.
- Diferenciá hechos de interpretación. No opines.
- Título informativo, sin clickbait, sin signos de exclamación, sin adjetivos sensacionalistas, de hasta 110 caracteres.
- Bajada de una o dos oraciones que agregue información, no que repita el título.
- Cada afirmación relevante va en "claims" con los ids de las fuentes que la respaldan, escritos exactamente como en el dossier (F1, F2…).
- La sección tiene que ser una de: ${categories.map((c) => c.slug).join(', ')}.

Extensión y desarrollo:
- Escribí una nota completa y detallada, no un resumen. Extensión del cuerpo: una noticia, de ${words.noticia.target[0]} a ${words.noticia.target[1]} palabras; un análisis o un explicador, de ${words.analisis.target[0]} a ${words.analisis.target[1]} palabras; una breve, de ${words.breve.target[0]} a ${words.breve.target[1]}.
- La extensión sale de las fuentes. Si el dossier no da para tanto, escribí menos. Nunca rellenes con generalidades ni agregues datos para llegar: la regla de usar solo lo que dicen las fuentes vale más que la extensión.
- Primer párrafo: lo esencial (qué pasó, quién, cuándo y dónde). Después, el desarrollo en varios párrafos, con subtítulos (bloques "h2") cada tres o cuatro párrafos: los detalles, las cifras, lo que dice cada parte, los antecedentes y el contexto que aportan las fuentes, y lo que se espera que pase, si las fuentes lo dicen.
- Usá todas las fuentes del dossier que aporten algo: cada una aparece nombrada en el texto al menos una vez, y cada afirmación de "claims" lleva todas las fuentes que la respaldan, no solo una.
- Incluí un bloque "facts" con lo que se sabe y lo que todavía no.`;

/**
 * Se repite al final del dossier, justo antes de que el modelo escriba: los modelos chicos respetan
 * mejor lo último que leen. Con un dossier real de 5 fuentes, flash-lite pasó de 467 a 541
 * palabras y de 3 a 5 fuentes citadas, sin datos inventados (octubre de 2026).
 */
const LENGTH_REMINDER = `Extensión del cuerpo, si las fuentes dan para eso: una noticia, entre ${words.noticia.target[0]} y ${words.noticia.target[1]} palabras; un análisis o un explicador, entre ${words.analisis.target[0]} y ${words.analisis.target[1]}; una breve, entre ${words.breve.target[0]} y ${words.breve.target[1]}. Varios párrafos con subtítulos, y todas las fuentes que aportan algo nombradas en el texto. No rellenes ni agregues nada que no esté en el dossier.`;

/** Nombre corto de cada fuente en el dossier: los modelos copian "F2" sin errores; un id largo, no. */
export const sourceAlias = (index: number) => `F${index + 1}`;

/** Dossier para el redactor: fuentes, estado de verificación y contradicciones. */
export function renderBrief(brief: ResearchBrief): string {
  const v = brief.verification;
  const sources = brief.sources
    .map((s, i) => `<fuente id="${sourceAlias(i)}" tipo="${s.kind}" nombre="${s.name}" publicada="${s.publishedAt}">\n${s.text}\n</fuente>`)
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

Redactá el borrador siguiendo las reglas. ${LENGTH_REMINDER}`;
}

/**
 * Traduce las fuentes citadas por el borrador a los ids reales del dossier. Acepta el alias
 * (F1), el id completo, o el id de la fuente configurada si corresponde a un solo ítem (los
 * ids de ítem son `fuente:url`). Lo que no se puede traducir queda igual, para que el control
 * posterior lo marque como fuente inexistente.
 */
export function resolveSourceIds<T extends { claims: { sourceIds: string[] }[] }>(draft: T, brief: ResearchBrief): T {
  const resolve = (cited: string): string => {
    const value = cited.trim();
    const alias = /^f(\d+)$/i.exec(value);
    if (alias) return brief.sources[Number(alias[1]) - 1]?.id ?? value;
    if (brief.sources.some((s) => s.id === value)) return value;
    const byPrefix = brief.sources.filter((s) => s.id.startsWith(`${value}:`));
    return byPrefix.length === 1 ? byPrefix[0].id : value;
  };
  return {
    ...draft,
    claims: draft.claims.map((c) => ({ ...c, sourceIds: [...new Set(c.sourceIds.map(resolve))] })),
  };
}
