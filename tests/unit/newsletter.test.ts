import { describe, expect, it } from 'vitest';
import { subscribeSchema } from '@/lib/newsletter/schema';
import { MemoryNewsletterStore, hashToken, PENDING_RETENTION_DAYS } from '@/lib/newsletter/store';
import { RateLimiter } from '@/lib/rate-limit';

const NOW = new Date('2026-10-01T12:00:00Z');

describe('validación de la suscripción', () => {
  it('acepta email y consentimiento explícito, y normaliza el email', () => {
    const r = subscribeSchema.safeParse({ email: '  Ana@Example.COM ', consent: true, consentTextVersion: 1 });
    expect(r.success && r.data.email).toBe('ana@example.com');
  });

  it('rechaza sin consentimiento, con email inválido o con el campo trampa completo', () => {
    expect(subscribeSchema.safeParse({ email: 'ana@example.com', consent: false, consentTextVersion: 1 }).success).toBe(false);
    expect(subscribeSchema.safeParse({ email: 'ana@', consent: true, consentTextVersion: 1 }).success).toBe(false);
    expect(subscribeSchema.safeParse({ email: 'ana@example.com', consent: true, consentTextVersion: 1, website: 'spam' }).success).toBe(false);
    expect(subscribeSchema.safeParse({ email: 'ana@example.com', consent: true, consentTextVersion: 0 }).success).toBe(false);
  });

  it('no acepta datos que no pide (solo email y consentimiento)', () => {
    const r = subscribeSchema.safeParse({ email: 'ana@example.com', consent: true, consentTextVersion: 1, nombre: 'Ana' });
    expect(r.success && 'nombre' in r.data).toBe(false);
  });
});

describe('almacenamiento de suscripciones', () => {
  it('doble opt-in: pendiente → confirmada → baja', async () => {
    const store = new MemoryNewsletterStore();
    const req = await store.requestSubscription('ana@example.com', 1, NOW);
    expect(req.kind).toBe('pending');
    if (req.kind !== 'pending') return;
    expect(store.records.get('ana@example.com')?.status).toBe('pending');
    expect(await store.confirm(req.confirmToken, NOW)).toBe('confirmed');
    expect(await store.confirm(req.confirmToken, NOW)).toBe('invalid'); // el token se usa una sola vez
    expect((await store.requestSubscription('ana@example.com', 1, NOW)).kind).toBe('alreadyConfirmed');
    expect(await store.unsubscribe(req.unsubscribeToken, NOW)).toBe('unsubscribed');
    expect(store.records.get('ana@example.com')?.status).toBe('unsubscribed');
  });

  it('guarda solo hashes de los tokens', async () => {
    const store = new MemoryNewsletterStore();
    const req = await store.requestSubscription('ana@example.com', 1, NOW);
    if (req.kind !== 'pending') throw new Error('esperaba pendiente');
    const record = store.records.get('ana@example.com')!;
    expect(JSON.stringify(record)).not.toContain(req.confirmToken);
    expect(record.confirmTokenHash).toBe(hashToken(req.confirmToken));
  });

  it('el enlace de confirmación vence a las 48 horas', async () => {
    const store = new MemoryNewsletterStore();
    const req = await store.requestSubscription('ana@example.com', 1, NOW);
    if (req.kind !== 'pending') throw new Error('esperaba pendiente');
    expect(await store.confirm(req.confirmToken, new Date(NOW.getTime() + 49 * 3_600_000))).toBe('expired');
  });

  it('borra las solicitudes nunca confirmadas pasado el plazo de retención', async () => {
    const store = new MemoryNewsletterStore();
    await store.requestSubscription('vieja@example.com', 1, NOW);
    const later = new Date(NOW.getTime() + (PENDING_RETENTION_DAYS + 1) * 86_400_000);
    await store.requestSubscription('nueva@example.com', 1, later);
    expect(store.records.has('vieja@example.com')).toBe(false);
    expect(store.records.has('nueva@example.com')).toBe(true);
  });
});

describe('límite de pedidos', () => {
  it('bloquea después del límite y libera al pasar la ventana', () => {
    const rl = new RateLimiter(2, 1000);
    expect(rl.check('ip', 0).allowed).toBe(true);
    expect(rl.check('ip', 10).allowed).toBe(true);
    const blocked = rl.check('ip', 20);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(rl.check('ip', 1500).allowed).toBe(true);
    expect(rl.check('otra-ip', 20).allowed).toBe(true);
  });
});
