/**
 * Límite de pedidos por clave (por ejemplo, IP) con ventana deslizante en memoria.
 *
 * Alcanza para un solo proceso. Con varias instancias o funciones serverless hay
 * que mover el contador a un almacenamiento compartido (Redis, Upstash, la base).
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return { allowed: false, retryAfterSeconds: Math.ceil((this.windowMs - (now - recent[0])) / 1000) };
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.sweep(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private sweep(now: number) {
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= this.windowMs)) this.hits.delete(key);
    }
  }
}

export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip') || 'unknown';
}
