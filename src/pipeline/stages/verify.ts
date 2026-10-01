import { editorial } from '@/config/editorial';
import type { Claim, Confidence, Contradiction, VerificationStatus } from '@/domain/types';
import type { Figure, SourceItem, StoryCluster, VerificationReport } from '../types';
import { differs, extractFigures, sameSubject } from './figures';
import { hedged, jaccard, stemSet } from '../text';

const PRIMARY_KINDS = new Set(['official', 'public_document', 'news_agency']);
/** Textos casi idénticos de orígenes distintos se tratan como réplica de una misma fuente. */
const SYNDICATION_SIMILARITY = 0.85;

const itemText = (it: SourceItem) => `${it.title}. ${it.summary} ${it.content ?? ''}`;

/**
 * Verificación de un grupo de ítems.
 *
 * 1. Descarta agregadores (solo sirven para descubrir) y agrupa por origen
 *    editorial; además detecta réplicas por similitud de texto.
 * 2. Extrae cifras de cada fuente y compara las que hablan de lo mismo: si
 *    difieren más que la tolerancia, registra una contradicción.
 * 3. Asigna estado y confianza con reglas explícitas.
 *
 * No decide qué es verdad: decide qué está respaldado por más de una fuente
 * independiente y qué necesita a una persona.
 */
export function verifyCluster(cluster: StoryCluster): VerificationReport {
  const reasons: string[] = [];
  const usable = cluster.items.filter((it) => !it.discoveryOnly);
  const discovery = cluster.items.length - usable.length;
  if (discovery > 0) reasons.push(`${discovery} ítem(s) de agregadores usados solo para detectar el tema.`);

  // Orígenes efectivos: el declarado, salvo que el texto sea una réplica de otro.
  const effectiveOrigin = new Map<string, string>();
  const stemmed = usable.map((it) => stemSet(itemText(it)));
  usable.forEach((it, i) => {
    let origin = it.origin;
    for (let j = 0; j < i; j++) {
      if (usable[j].origin !== it.origin && jaccard(stemmed[i], stemmed[j]) >= SYNDICATION_SIMILARITY) {
        origin = effectiveOrigin.get(usable[j].id)!;
        reasons.push(`"${it.sourceName}" replica el texto de "${usable[j].sourceName}": cuentan como una sola fuente.`);
        break;
      }
    }
    effectiveOrigin.set(it.id, origin);
  });
  const origins = [...new Set(effectiveOrigin.values())];
  const independentSources = origins.length;

  // Cifras y contradicciones entre orígenes distintos.
  const figures: Figure[] = usable.flatMap((it) => extractFigures(itemText(it), it.id));
  const contradictions: Contradiction[] = [];
  const seenPairs = new Set<string>();
  for (let i = 0; i < figures.length; i++) {
    for (let j = i + 1; j < figures.length; j++) {
      const a = figures[i];
      const b = figures[j];
      if (effectiveOrigin.get(a.itemId) === effectiveOrigin.get(b.itemId)) continue;
      if (!sameSubject(a, b) || !differs(a.value, b.value, editorial.verification.figureTolerance)) continue;
      const key = [a.unit, ...[a.itemId, b.itemId].sort()].join('|');
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      const nameA = usable.find((u) => u.id === a.itemId)?.sourceName ?? a.itemId;
      const nameB = usable.find((u) => u.id === b.itemId)?.sourceName ?? b.itemId;
      contradictions.push({
        topic: `Cifra en ${unitLabel(a.unit)} sobre ${a.context.slice(-2).join(' ')}`,
        detail: `${nameA} informa "${a.raw}"; ${nameB} informa "${b.raw}".`,
        sourceIds: [a.itemId, b.itemId],
      });
    }
  }

  // Afirmaciones: el titular de cada fuente, marcado según su redacción.
  const claims: Claim[] = usable.map((it, i) => ({
    id: `${cluster.id}-c${i + 1}`,
    text: it.title,
    status: hedged(itemText(it)) ? 'unconfirmed' : 'confirmed',
    sourceIds: [it.id],
  }));
  const allHedged = usable.length > 0 && usable.every((it) => hedged(itemText(it)));
  if (allHedged) reasons.push('Todas las fuentes usan lenguaje condicional ("habría", "trascendió").');

  let status: VerificationStatus;
  let confidence: Confidence;
  if (independentSources < 2) {
    status = 'unverified';
    confidence = 'low';
    reasons.push('Hay una sola fuente independiente: no se puede publicar como hecho.');
  } else if (contradictions.length > 0) {
    status = 'disputed';
    confidence = 'medium';
    reasons.push(`${contradictions.length} contradicción(es) entre fuentes: requiere revisión humana.`);
  } else if (allHedged) {
    status = 'partial';
    confidence = 'low';
  } else {
    status = 'verified';
    const hasPrimary = usable.some((it) => PRIMARY_KINDS.has(it.sourceKind));
    confidence = independentSources >= 3 || hasPrimary ? 'high' : 'medium';
    reasons.push(`${independentSources} fuentes independientes coinciden${hasPrimary ? ', incluida una primaria' : ''}.`);
  }

  return { clusterId: cluster.id, status, confidence, independentSources, origins, contradictions, claims, figures, reasons };
}

function unitLabel(unit: string | null): string {
  const labels: Record<string, string> = {
    usd: 'dólares',
    eur: 'euros',
    ars: 'pesos',
    percent: 'porcentaje',
    km: 'kilómetros',
    kmh: 'km/h',
    m: 'metros',
    t: 'toneladas',
    ha: 'hectáreas',
    months: 'meses',
    years: 'años',
    days: 'días',
    hours: 'horas',
    people: 'personas',
  };
  return unit ? (labels[unit] ?? unit) : 'unidades';
}
