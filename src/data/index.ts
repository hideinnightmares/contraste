import 'server-only';
import { cache } from 'react';
import type { ArticleRepository } from './repository';
import { DemoArticleRepository } from './demo-repository';
import { DemoPopularityProvider, type PopularityProvider } from './popularity';

/**
 * Punto único de elección de la fuente de contenido.
 *
 * CONTENT_SOURCE=demo     → dataset ficticio en memoria (por defecto).
 * CONTENT_SOURCE=database → pendiente: implementar `ArticleRepository` sobre la base
 *                           (ver docs/ARQUITECTURA.md, "Conectar una base de datos").
 * CONTENT_SOURCE=cms      → pendiente: implementar sobre la API del CMS elegido.
 *
 * Si se pide una fuente que no existe, falla al arrancar: nunca se cae en silencio
 * al contenido de demostración.
 */
export const getRepository = cache((): ArticleRepository => {
  const source = process.env.CONTENT_SOURCE ?? 'demo';
  switch (source) {
    case 'demo':
      return new DemoArticleRepository();
    default:
      throw new Error(
        `CONTENT_SOURCE="${source}" no tiene implementación. Las fuentes disponibles son: demo. Ver docs/ARQUITECTURA.md.`,
      );
  }
});

export const getPopularity = cache((): PopularityProvider => {
  const source = process.env.CONTENT_SOURCE ?? 'demo';
  if (source === 'demo') return new DemoPopularityProvider();
  throw new Error('No hay proveedor de "más leídas" configurado para esta fuente de contenido.');
});
