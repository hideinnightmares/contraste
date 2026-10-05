import { bodyText, normalize } from '@/domain/text';
import { overlapCoefficient, stemSet } from '../text';
import { editorial } from '@/config/editorial';
import type { DraftArticle, GroundingReport, ResearchBrief } from '../types';
import { differs, extractFigures } from './figures';

/**
 * Control posterior a la redacción: el borrador no puede contener cifras ni
 * nombres propios que no estén en las fuentes. Es la red de seguridad contra
 * datos inventados por el modelo; si falla, la nota va a revisión humana.
 */
export function checkGrounding(draft: DraftArticle, brief: ResearchBrief): GroundingReport {
  // El nombre de cada fuente cuenta como dato de la fuente: el redactor lo usa para atribuir.
  const sourceText = brief.sources.map((s) => `${s.name}\n${s.text}`).join('\n');
  const sourceFigures = extractFigures(sourceText, 'sources');
  const draftText = [draft.title, draft.dek, bodyText(draft.body)].join('\n');

  const ungroundedFigures = extractFigures(draftText, 'draft')
    .filter(
      (f) =>
        !sourceFigures.some(
          (s) => (s.unit === f.unit || s.unit === null || f.unit === null) && !differs(s.value, f.value, editorial.verification.figureTolerance),
        ),
    )
    .map((f) => f.raw);

  const normalizedSources = normalize(sourceText);
  const ungroundedNames = properNames(namesText(draft)).filter((name) => !normalizedSources.includes(normalize(name)));

  const known = new Set(brief.sources.map((s) => s.id));
  const unknownSourceIds = draft.claims.flatMap((c) => c.sourceIds).filter((id) => !known.has(id));

  const contradictoryFacts = selfContradictions(draft);

  return {
    ok: ungroundedFigures.length === 0 && ungroundedNames.length === 0 && unknownSourceIds.length === 0 && contradictoryFacts.length === 0,
    ungroundedFigures: [...new Set(ungroundedFigures)],
    ungroundedNames: [...new Set(ungroundedNames)],
    unknownSourceIds: [...new Set(unknownSourceIds)],
    contradictoryFacts,
  };
}

/**
 * Un mismo dato no puede figurar como confirmado y como no confirmado en el
 * recuadro de hechos. Los modelos parafrasean ("el plazo estipulado es de 18
 * meses" / "el plazo de obra sería de 18 meses"), así que se comparan raíces:
 * dos frases son el mismo dato si comparten la misma cifra y al menos el 40 %
 * de las raíces de la más corta, o, sin cifra en común, el 60 %. Ante la duda
 * marca: el costo de un falso positivo es una revisión humana.
 */
export function selfContradictions(draft: DraftArticle): string[] {
  const numbers = (text: string) => new Set(normalize(text).match(/\d+(?:[.,]\d+)?/g) ?? []);
  const found: string[] = [];
  for (const block of draft.body) {
    if (block.type !== 'facts') continue;
    for (const confirmed of block.confirmed) {
      const confirmedStems = stemSet(confirmed);
      const confirmedNumbers = numbers(confirmed);
      const clash = block.unconfirmed.some((unconfirmed) => {
        const { score, shared } = overlapCoefficient(confirmedStems, stemSet(unconfirmed));
        const sameFigure = [...numbers(unconfirmed)].some((n) => confirmedNumbers.has(n));
        return sameFigure ? score >= 0.4 : score >= 0.6 && shared >= 2;
      });
      if (clash) found.push(confirmed);
    }
  }
  return found;
}

/**
 * El texto del borrador para buscar nombres, con un salto de línea entre los
 * ítems de listas y recuadros y entre el título y el texto de una nota.
 * `bodyText` los une con un espacio y el final de un ítem se pegaba al
 * principio del siguiente: "…con Brasil" + "El acuerdo…" daba "Brasil El".
 */
function namesText(draft: DraftArticle): string {
  const lines = draft.body.flatMap((block): string[] => {
    switch (block.type) {
      case 'p':
      case 'h2':
        return [block.text];
      case 'list':
        return block.items;
      case 'facts':
        return [...block.confirmed, ...block.unconfirmed];
      case 'note':
        return [block.title, block.text];
    }
  });
  return [draft.title, draft.dek, ...lines].join('\n');
}

/**
 * Nombres propios: secuencias de dos o más palabras capitalizadas que no están
 * al inicio de una oración. Heurística simple, a propósito conservadora.
 */
export function properNames(text: string): string[] {
  const names: string[] = [];
  const word = '[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+';
  const link = '(?:de(?: +(?:la|las|los))?|del|la|las|los|y)';
  const re = new RegExp(`${word}(?: +(?:${link} +)?${word})+`, 'g');
  for (const sentence of text.split(/[.!?¿¡:;\n]+/)) {
    const trimmed = sentence.trimStart();
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(trimmed))) {
      // La primera palabra de una oración siempre va en mayúscula: no indica nombre propio.
      const candidate = m.index === 0 ? m[0].replace(new RegExp(`^${word} +(?:${link} +)?`), '') : m[0];
      // "y" separa dos nombres ("Lula y Bolsonaro"): cada parte se valida por su cuenta.
      for (const part of candidate.split(/ +y +/)) {
        if (/^[A-ZÁÉÍÓÚÑ]\S+(?: +\S+)+$/.test(part)) names.push(part);
      }
    }
  }
  return names;
}
