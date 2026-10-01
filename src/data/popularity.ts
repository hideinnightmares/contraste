import { demoMostReadSlugs } from '@/content/demo';

/**
 * Ranking de notas más leídas.
 *
 * `simulated: true` obliga a la interfaz a aclarar que el orden no surge de datos
 * reales de lectura. Un proveedor real (analytics propio, Plausible, GA4 vía API)
 * devuelve `simulated: false` y nunca expone cifras de visitas en la portada.
 */
export interface PopularityProvider {
  mostRead(limit: number): Promise<{ slugs: string[]; simulated: boolean }>;
}

export class DemoPopularityProvider implements PopularityProvider {
  async mostRead(limit: number) {
    return { slugs: demoMostReadSlugs.slice(0, limit), simulated: true };
  }
}
