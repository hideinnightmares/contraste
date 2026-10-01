import { z } from 'zod';

/** Versión del texto de consentimiento mostrado junto al formulario. Si cambia el texto, se incrementa. */
export const CONSENT_TEXT_VERSION = 1;

export const subscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, 'El email es demasiado largo.')
    .pipe(z.email('Revisá el email: tiene que tener la forma nombre@dominio.com.')),
  consent: z.literal(true, { error: 'Para suscribirte, marcá la casilla de consentimiento.' }),
  consentTextVersion: z.literal(CONSENT_TEXT_VERSION, { error: 'El texto de consentimiento cambió. Recargá la página.' }),
  /** Campo trampa: las personas no lo ven; los bots suelen completarlo. */
  website: z.string().max(0).optional().default(''),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;

export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,128}$/);
