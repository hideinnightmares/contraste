import 'server-only';
import { cache } from 'react';
import type { ArticleRepository } from './repository';
import { site } from '@/config/site';
import { DemoArticleRepository } from './demo-repository';
import { SnapshotArticleRepository } from './snapshot-repository';
import { DemoPopularityProvider, UnmeasuredPopularityProvider, type PopularityProvider } from './popularity';

/**
 * Punto único de elección de la fuente de contenido.
 *
 * CONTENT_SOURCE=demo     → dataset ficticio en memoria (por defecto).
 * CONTENT_SOURCE=database → notas publicadas en Supabase, desde la foto que descarga
 *                           `npm run content:sync` antes del armado (docs/BASE-DE-DATOS.md).
 *
 * Si se pide una fuente que no existe, falla al arrancar: nunca se cae en silencio
 * al contenido de demostración.
 */
export const getRepository = cache((): ArticleRepository => {
  const source = process.env.CONTENT_SOURCE ?? 'demo';
  switch (source) {
    case 'demo':
      return new DemoArticleRepository();
    case 'database':
      return new SnapshotArticleRepository(undefined, { demoMode: site.demoMode });
    default:
      throw new Error(
        `CONTENT_SOURCE="${source}" no tiene implementación. Las fuentes disponibles son: demo, database. Ver docs/ARQUITECTURA.md.`,
      );
  }
});

export const getPopularity = cache((): PopularityProvider => {
  const source = process.env.CONTENT_SOURCE ?? 'demo';
  if (source === 'demo') return new DemoPopularityProvider();
  // Todavía no se miden lecturas: sin datos, "Más leídas" no se muestra (nunca un ranking inventado).
  return new UnmeasuredPopularityProvider();
});
