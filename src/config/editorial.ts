import type { ContentType } from '@/domain/types';

/**
 * Reglas editoriales que usan la portada y el pipeline de automatización.
 * Son números de negocio, no de código: viven acá para poder ajustarlos sin
 * tocar la lógica.
 */
export const editorial = {
  frontPage: {
    /** Horas en que una nota pierde la mitad de su peso en portada, por formato. */
    halfLifeHours: {
      noticia: 10,
      breve: 4,
      analisis: 30,
      explicador: 36,
    } satisfies Record<ContentType, number>,
    /** Máximo de notas de una misma sección entre la principal y las secundarias. */
    maxPerCategoryInTop: 1,
    secondaryCount: 3,
    quickCount: 4,
    analysisCount: 3,
    latestCount: 7,
    mostReadCount: 5,
    perSectionCount: 4,
    recommendedCount: 4,
  },
  review: {
    /**
     * `human`: todo borrador generado pasa por una persona antes de publicarse.
     * `policy`: se publican solas las notas que cumplen TODAS las condiciones de abajo;
     *           el resto va a revisión humana.
     * El valor por defecto es `human` hasta que la redacción decida lo contrario.
     */
    mode: (process.env.CONTRASTE_REVIEW_MODE === 'policy' ? 'policy' : 'human') as 'human' | 'policy',
    autoPublish: {
      minIndependentSources: 2,
      minConfidence: 'high' as const,
      allowContradictions: false,
      allowUngroundedFigures: false,
      /** Secciones que siempre requieren revisión humana, cumplan o no lo anterior. */
      alwaysHumanReview: ['politica'],
    },
  },
  dedupe: {
    /** Similitud mínima de títulos (0–1) para considerar que dos ítems cuentan lo mismo. */
    titleSimilarity: 0.5,
    /** Ventana máxima entre publicaciones de un mismo hecho. */
    windowHours: 36,
  },
  verification: {
    /** Diferencia relativa a partir de la cual dos cifras sobre lo mismo se consideran contradictorias. */
    figureTolerance: 0.02,
  },
  seo: {
    maxTitleLength: 70,
    maxDescriptionLength: 155,
  },
} as const;
