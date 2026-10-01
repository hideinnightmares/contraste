/**
 * Newsletter.
 *
 * El sitio es estático: guardar suscripciones y mandar correos necesita algo
 * afuera (una función de Cloudflare con base de datos, o el proveedor de email).
 * Mientras `endpoint` sea `null`, la portada ofrece el RSS en lugar de un
 * formulario que no podría funcionar. Para habilitarlo hay que implementar el alta
 * y las páginas de confirmación y baja (ver docs/NEWSLETTER.md).
 */
export const newsletter: { endpoint: string | null } = {
  endpoint: null,
};
