import type { Confidence, ContentType, SourceKind, VerificationStatus } from './types';

/** Etiqueta visible del formato. La noticia no lleva etiqueta: es el formato por defecto. */
export const contentTypeLabel: Record<ContentType, string | null> = {
  noticia: null,
  analisis: 'Análisis',
  explicador: 'Qué se sabe',
  breve: 'Breve',
};

export const verificationLabel: Record<VerificationStatus, { short: string; long: string }> = {
  verified: {
    short: 'Verificada',
    long: 'Los hechos centrales coinciden en al menos dos fuentes independientes.',
  },
  partial: {
    short: 'Verificación parcial',
    long: 'Los hechos centrales están confirmados; algunos detalles todavía no.',
  },
  developing: {
    short: 'En desarrollo',
    long: 'El hecho está en curso y la información puede cambiar. Actualizamos la nota a medida que se confirma.',
  },
  disputed: {
    short: 'Fuentes en desacuerdo',
    long: 'Las fuentes consultadas se contradicen en algún punto. Lo señalamos en el texto y no lo damos por cierto.',
  },
  unverified: {
    short: 'Sin verificar',
    long: 'No hay confirmación independiente. No se publica como hecho.',
  },
};

export const confidenceLabel: Record<Confidence, string> = {
  high: 'Confianza alta',
  medium: 'Confianza media',
  low: 'Confianza baja',
};

export const sourceKindLabel: Record<SourceKind, string> = {
  news_agency: 'Agencia de noticias',
  international_media: 'Medio internacional',
  local_media: 'Medio local',
  official: 'Organismo oficial',
  public_document: 'Documento público',
  aggregator: 'Agregador',
  other: 'Otra fuente',
};

export function sourcesPhrase(count: number): string {
  return count === 1 ? '1 fuente' : `${count} fuentes`;
}
