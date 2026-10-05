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
  collection: {
    /**
     * Notas que no son un hecho para contrastar y se descartan al recopilar: coberturas en vivo
     * (se actualizan todo el día y sus cifras cambian de una hora a otra) y páginas de servicio
     * (cotizaciones del día, clima, horóscopo, sorteos). Se comparan con el título.
     */
    skipTitles: [
      /\b(?:en vivo|en directo|minuto a minuto)\b/i,
      /^\s*🔴/u,
      /\bd[oó]lar(?:\s+[a-záéíóúñ]+){0,2}\s+hoy\b/i,
      /\bcotizaci[oó]n\b.*\bhoy\b/i,
      /^\s*(?:el\s+)?clima en\b/i,
      /\bpron[oó]stico del tiempo\b/i,
      /\bhor[oó]scopo\b/i,
      /\b(?:quiniela|quini 6|loto plus|brinco)\b/i,
    ],
  },
  drafting: {
    /**
     * Borradores de una misma sección por corrida, como máximo (la sección que asigna el
     * clasificador). Así una corrida no se llena de un solo tema: el resto queda para la próxima.
     */
    maxPerCategoryPerRun: 2,
    /**
     * Fuentes independientes que necesita un hecho para que se redacte (CONTRASTE_MIN_FUENTES).
     * Con menos, espera a que se sume otra en una corrida siguiente. Verificado alcanza con 2;
     * para redactar se pide más, así las notas se apoyan en más de una versión.
     */
    minIndependentSources: 3,
    /**
     * Extensión del cuerpo, en palabras, según el formato. El redactor apunta a `target`; por
     * debajo de `min`, se le pide la nota a otro modelo de la cadena y, si ninguno llega, va a la
     * mesa con el aviso. La extensión sale de las fuentes: nunca se rellena para llegar.
     */
    words: {
      noticia: { min: 450, target: [600, 900] },
      analisis: { min: 600, target: [800, 1100] },
      explicador: { min: 600, target: [800, 1100] },
      breve: { min: 0, target: [80, 200] },
    } as const satisfies Record<ContentType, { min: number; target: readonly [number, number] }>,
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
