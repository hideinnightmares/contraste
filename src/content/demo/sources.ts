import type { SourceKind } from '@/domain/types';

/**
 * Fuentes ficticias del dataset de demostración.
 *
 * No imitan a ningún medio ni organismo real: se nombran por tipo y llevan
 * "(demo)" en el nombre. Sus enlaces apuntan a example.com, un dominio reservado
 * para ejemplos. `group` indica el origen editorial: dos fuentes del mismo grupo
 * (por ejemplo, un portal que replica el cable de una agencia) cuentan como una
 * sola fuente independiente.
 */
export const demoSources = {
  'agencia-nacional': { name: 'Agencia nacional de noticias (demo)', kind: 'news_agency', group: 'A' },
  'replica-agencia': { name: 'Portal que replica el cable de la agencia nacional (demo)', kind: 'local_media', group: 'A' },
  'agencia-internacional': { name: 'Agencia internacional de noticias (demo)', kind: 'news_agency', group: 'B' },
  'diario-regional': { name: 'Diario regional (demo)', kind: 'local_media', group: 'C' },
  'radio-local': { name: 'Radio local (demo)', kind: 'local_media', group: 'D' },
  'diario-internacional': { name: 'Diario internacional (demo)', kind: 'international_media', group: 'E' },
  organismo: { name: 'Organismo público responsable (demo)', kind: 'official', group: 'F' },
  'boletin-oficial': { name: 'Boletín oficial (demo)', kind: 'public_document', group: 'G' },
  universidad: { name: 'Universidad pública (demo)', kind: 'other', group: 'H' },
  'informe-tecnico': { name: 'Informe técnico publicado (demo)', kind: 'public_document', group: 'I' },
  'camara-sector': { name: 'Cámara empresaria del sector (demo)', kind: 'other', group: 'J' },
  'comunicado-empresa': { name: 'Comunicado de la empresa involucrada (demo)', kind: 'other', group: 'K' },
  'asociacion-consumidores': { name: 'Asociación de consumidores (demo)', kind: 'other', group: 'L' },
  'servicio-meteorologico': { name: 'Servicio meteorológico (demo)', kind: 'official', group: 'M' },
  agregador: { name: 'Agregador de noticias (demo)', kind: 'aggregator', group: 'N' },
} as const satisfies Record<string, { name: string; kind: SourceKind; group: string }>;

export type DemoSourceKey = keyof typeof demoSources;
