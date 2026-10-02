import { sourceDefinitions, wireAgencies } from '@/config/sources';
import type { KnownOutlet, SourceDefinition } from '../types';

/**
 * Atribuciones entre medios: una nota que dice "según informó Clarín", que lleva la firma de
 * una agencia ("BUENOS AIRES (NA).-") o que cierra con "Fuente: EFE" no aporta una fuente
 * independiente: repite a ese medio. El verificador la cuenta como ese medio.
 *
 * Se buscan los nombres tal como se escriben, sin acentos pero con mayúsculas: "La Nación" es
 * el diario y "la Nación", el Estado nacional; "NA" es la agencia y "na", cualquier otra cosa.
 * Solo cuenta un nombre precedido por una expresión de atribución o entre paréntesis.
 */

const MEDIA_KINDS = new Set(['news_agency', 'local_media', 'international_media', 'other']);

/** Quita los acentos sin tocar las mayúsculas (conserva la longitud del texto en NFC). */
const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** "el diario", "la agencia" o solo el artículo ("el Diario del Bosque") entre el verbo y el nombre. */
const OUTLET_WORD =
  '(?:(?:el|al) (?:diario|portal|sitio|medio|canal|semanario|periodico) |la (?:agencia(?: de noticias)?|cadena|radio|revista) |(?:el|al|la|los|las) )?';
const VERB =
  '(?:informo|informa|informaron|publico|publica|consigno|consigna|revelo|revela|indico|indica|difundio|difunde|reporto|reporta|anticipo|adelanto|confirmo|confirma|senalo|senala|detallo|detalla)';
const CONNECTOR = '(?:[Cc]on informacion de|[Ff]uente:|[Dd]e acuerdo con|[Cc]itad[oa] por|[Ss]egun datos de)';

function patternsFor(alias: string): RegExp[] {
  const name = escape(fold(alias));
  const end = '(?![\\p{L}\\p{N}])';
  return [
    new RegExp(`(?<![\\p{L}])[Ss]egun (?:lo que |lo )?(?:${VERB} )?${OUTLET_WORD}${name}${end}`, 'u'),
    new RegExp(`(?<![\\p{L}])${VERB} ${OUTLET_WORD}${name}${end}`, 'u'),
    new RegExp(`${CONNECTOR} ${OUTLET_WORD}${name}${end}`, 'u'),
    new RegExp(`\\(${name}\\)`, 'u'),
  ];
}

/**
 * Medios que otra nota puede citar: los configurados (activos o no) y las agencias conocidas
 * que no estén configuradas. Los organismos oficiales no entran: que varios medios citen al
 * INDEC no los vuelve una sola fuente, y el dato oficial se verifica en su propio documento.
 */
export function knownOutlets(definitions: SourceDefinition[] = sourceDefinitions, agencies: KnownOutlet[] = wireAgencies): KnownOutlet[] {
  const configured = definitions
    .filter((d) => MEDIA_KINDS.has(d.kind) && !d.discoveryOnly)
    .map((d) => ({ name: d.name, origin: d.origin, aliases: [d.name, ...(d.aliases ?? [])] }));
  const taken = new Set(configured.flatMap((o) => o.aliases.map((a) => fold(a).toLowerCase())));
  return [...configured, ...agencies.filter((a) => !a.aliases.some((alias) => taken.has(fold(alias).toLowerCase())))];
}

const compiled = new WeakMap<KnownOutlet, RegExp[]>();

/** El primer medio (de otro origen) al que el texto atribuye su información, o `null`. */
export function citedOutlet(text: string, outlets: KnownOutlet[], ownOrigin: string): KnownOutlet | null {
  const folded = fold(text);
  for (const outlet of outlets) {
    if (outlet.origin === ownOrigin) continue;
    let patterns = compiled.get(outlet);
    if (!patterns) {
      patterns = outlet.aliases.flatMap(patternsFor);
      compiled.set(outlet, patterns);
    }
    if (patterns.some((p) => p.test(folded))) return outlet;
  }
  return null;
}
