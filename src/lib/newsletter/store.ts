import { createHash, randomBytes } from 'node:crypto';

/**
 * Almacenamiento de suscripciones.
 *
 * Guarda lo mínimo: email, estado, constancia del consentimiento y los hashes de
 * los tokens (nunca el token en claro, así una copia de la base no permite
 * confirmar ni dar de baja a nadie).
 *
 * El sitio es estático: esta lógica corre donde se implemente el alta (una
 * función de Cloudflare con una base de datos, o el proveedor de email). Hasta
 * entonces el newsletter está deshabilitado. Ver docs/NEWSLETTER.md.
 */
export type SubscriptionStatus = 'pending' | 'confirmed' | 'unsubscribed';

export interface Subscription {
  email: string;
  status: SubscriptionStatus;
  consentTextVersion: number;
  consentAt: string;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  confirmTokenHash: string | null;
  confirmTokenExpiresAt: string | null;
  unsubscribeTokenHash: string;
}

export interface NewsletterStore {
  /**
   * Registra o renueva una suscripción pendiente y devuelve tokens nuevos.
   * Si ya estaba confirmada, devuelve `alreadyConfirmed` y no cambia nada.
   */
  requestSubscription(email: string, consentTextVersion: number, now: Date): Promise<
    { kind: 'pending'; confirmToken: string; unsubscribeToken: string } | { kind: 'alreadyConfirmed' }
  >;
  confirm(token: string, now: Date): Promise<'confirmed' | 'expired' | 'invalid'>;
  unsubscribe(token: string, now: Date): Promise<'unsubscribed' | 'invalid'>;
}

export const CONFIRM_TOKEN_TTL_HOURS = 48;
/** Las solicitudes nunca confirmadas se borran pasado este plazo (ver política de privacidad). */
export const PENDING_RETENTION_DAYS = 7;

export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Lógica compartida por cualquier implementación: opera sobre un mapa email → suscripción. */
export function applyRequest(
  records: Map<string, Subscription>,
  email: string,
  consentTextVersion: number,
  now: Date,
): { kind: 'pending'; confirmToken: string; unsubscribeToken: string } | { kind: 'alreadyConfirmed' } {
  const existing = records.get(email);
  if (existing?.status === 'confirmed') return { kind: 'alreadyConfirmed' };
  const confirmToken = newToken();
  const unsubscribeToken = newToken();
  records.set(email, {
    email,
    status: 'pending',
    consentTextVersion,
    consentAt: now.toISOString(),
    confirmedAt: null,
    unsubscribedAt: null,
    confirmTokenHash: hashToken(confirmToken),
    confirmTokenExpiresAt: new Date(now.getTime() + CONFIRM_TOKEN_TTL_HOURS * 3_600_000).toISOString(),
    unsubscribeTokenHash: hashToken(unsubscribeToken),
  });
  return { kind: 'pending', confirmToken, unsubscribeToken };
}

export function applyConfirm(records: Map<string, Subscription>, token: string, now: Date) {
  const hash = hashToken(token);
  const record = [...records.values()].find((r) => r.confirmTokenHash === hash);
  if (!record) return 'invalid' as const;
  if (!record.confirmTokenExpiresAt || new Date(record.confirmTokenExpiresAt) < now) return 'expired' as const;
  record.status = 'confirmed';
  record.confirmedAt = now.toISOString();
  record.confirmTokenHash = null;
  record.confirmTokenExpiresAt = null;
  return 'confirmed' as const;
}

export function applyUnsubscribe(records: Map<string, Subscription>, token: string, now: Date) {
  const hash = hashToken(token);
  const record = [...records.values()].find((r) => r.unsubscribeTokenHash === hash);
  if (!record) return 'invalid' as const;
  record.status = 'unsubscribed';
  record.unsubscribedAt = now.toISOString();
  record.confirmTokenHash = null;
  record.confirmTokenExpiresAt = null;
  return 'unsubscribed' as const;
}

/** Elimina solicitudes pendientes que nunca se confirmaron dentro del plazo de retención. */
export function purgeStale(records: Map<string, Subscription>, now: Date) {
  const limit = now.getTime() - PENDING_RETENTION_DAYS * 86_400_000;
  for (const [email, r] of records) {
    if (r.status === 'pending' && new Date(r.consentAt).getTime() < limit) records.delete(email);
  }
}

/** Implementación en memoria (tests). */
export class MemoryNewsletterStore implements NewsletterStore {
  readonly records = new Map<string, Subscription>();
  async requestSubscription(email: string, version: number, now: Date) {
    purgeStale(this.records, now);
    return applyRequest(this.records, email, version, now);
  }
  async confirm(token: string, now: Date) {
    return applyConfirm(this.records, token, now);
  }
  async unsubscribe(token: string, now: Date) {
    return applyUnsubscribe(this.records, token, now);
  }
}
