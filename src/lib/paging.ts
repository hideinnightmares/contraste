/**
 * Paginación con la página en la dirección (`/seccion/economia/pagina/2`), no en
 * `?pagina=2`: así cada página de un listado se genera de antemano como archivo.
 */

/** Segmentos de una ruta `[[...pagina]]`: ninguno es la página 1; `['pagina', 'n']`, la página n ≥ 2. */
export function pageFromSegments(segments: string[] | undefined): number | null {
  if (!segments || segments.length === 0) return 1;
  if (segments.length !== 2 || segments[0] !== 'pagina' || !/^[1-9]\d*$/.test(segments[1])) return null;
  const page = Number(segments[1]);
  return page >= 2 ? page : null;
}

/** Parámetros de `[[...pagina]]` para generar las páginas 1 a `pageCount` (siempre al menos la 1). */
export function pageSegments(pageCount: number): string[][] {
  return Array.from({ length: Math.max(pageCount, 1) }, (_, i) => (i === 0 ? [] : ['pagina', String(i + 1)]));
}

export const pageCount = (total: number, pageSize: number) => Math.max(1, Math.ceil(total / pageSize));
