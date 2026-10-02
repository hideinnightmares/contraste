/**
 * Cómo se presenta el pipeline ante los sitios que lee. El nombre (`ContrasteBot`) es el que
 * un sitio usa en su robots.txt para dejarnos afuera, y la dirección lleva a la explicación
 * pública de qué leemos y para qué (/metodologia#lector).
 */
export const BOT_TOKEN = 'ContrasteBot';

/**
 * Se arma al usarse, no al importarse: el CLI carga las variables de entorno (.env.production)
 * después de importar los módulos.
 */
export function userAgent(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  return site ? `${BOT_TOKEN}/1.0 (+${site}/metodologia#lector)` : `${BOT_TOKEN}/1.0`;
}
