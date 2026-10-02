import type { Page, Route } from '@playwright/test';
import type { Article } from '@/domain/types';

/**
 * Supabase simulado para probar la mesa de redacción sin tocar la base real. Responde los
 * pedidos que hace supabase-js desde la página: inicio de sesión (`/auth/v1`) y datos
 * (`/rest/v1`, PostgREST). Imita lo del servidor que le importa a la pantalla:
 *
 * - solo una persona que está en `editors` ve notas;
 * - una actualización exige la misma `updated_at` que se leyó (si no, no cambia nada);
 * - al publicar, la base pone la fecha y la firma, y rechaza lo que las reglas no permiten
 *   (trigger `private.articles_reglas`, ver supabase/migrations).
 *
 * Todas las notas son de demostración: fuentes ficticias en example.com.
 */

export const EDITOR = { id: '7d3c1a52-0b1e-4c55-9a0e-2f6b8c1d4e90', email: 'editora@example.com', password: 'clave-de-prueba' };
export const OUTSIDER = { id: '1f0e9d8c-7b6a-4c3d-8e2f-1a0b9c8d7e6f', email: 'lector@example.com', password: 'clave-de-prueba' };

export interface Row {
  id: string;
  document: Article;
  writer: string | null;
  created_at: string;
  updated_at: string;
}

const T0 = '2026-10-02T17:52:01.738Z';

function source(slug: string, name: string, kind: Article['sources'][number]['kind']): Article['sources'][number] {
  return { id: `prueba-${slug}`, name, kind, url: `https://example.com/prueba/${slug}`, consultedAt: T0, isDemo: true };
}

function note(over: Partial<Article> & Pick<Article, 'slug' | 'title' | 'dek' | 'category' | 'body' | 'sources' | 'verification' | 'review'>): Article {
  return {
    id: `auto-${over.slug}`,
    type: 'noticia',
    tags: ['prueba'],
    image: null,
    byline: { kind: 'automated_desk', name: 'Mesa editorial de Contraste' },
    publishedAt: T0,
    updatedAt: T0,
    priority: 2,
    seo: { title: over.title, description: over.dek },
    updates: [],
    live: false,
    isDemo: true,
    ...over,
  };
}

const checks = { dates: 'passed', names: 'passed', figures: 'passed' } as const;

/** Las notas con las que arranca la base simulada. */
export function fixtureRows(): Row[] {
  const agencia = source('agencia/puerto-dragado', 'Agencia nacional de noticias (prueba)', 'news_agency');
  const diario = source('internacional/puerto-dragado', 'Diario internacional (prueba)', 'international_media');
  const municipio = source('municipio/puente-salado', 'Municipio de Río Salado (prueba)', 'official');
  const local = source('local/puente-salado', 'Diario local (prueba)', 'local_media');
  const biblioteca = source('municipio/biblioteca-horario', 'Secretaría de Cultura (prueba)', 'official');
  const radio = source('local/biblioteca-horario', 'Radio local (prueba)', 'local_media');

  const disputed = note({
    slug: 'el-puerto-licitara-el-dragado-del-canal-de-acceso',
    title: 'El puerto licitará el dragado del canal de acceso',
    dek: 'La administración portuaria prepara la convocatoria para mejorar la vía navegable, con un año y medio de obra.',
    category: 'economia',
    tags: ['puerto', 'dragado'],
    body: [
      { type: 'p', text: 'La administración portuaria informó que avanzará en una licitación para dragar el canal de acceso.' },
      {
        type: 'note',
        tone: 'disputed',
        title: 'Diferencias sobre el monto de la inversión',
        text: 'La agencia nacional informa 120 millones de dólares y el diario internacional, 150 millones.',
      },
      { type: 'facts', confirmed: ['El puerto licitará el dragado del canal de acceso.'], unconfirmed: ['El monto final de la inversión.'] },
    ],
    sources: [agencia, diario],
    verification: {
      status: 'disputed',
      confidence: 'medium',
      independentSources: 2,
      checkedAt: T0,
      claims: [
        { id: 'c1', text: 'El puerto licitará el dragado del canal de acceso.', status: 'confirmed', sourceIds: [agencia.id, diario.id] },
        { id: 'c2', text: 'La inversión es de 120 millones de dólares.', status: 'disputed', sourceIds: [agencia.id] },
        { id: 'c3', text: 'La inversión es de 150 millones de dólares.', status: 'disputed', sourceIds: [diario.id] },
      ],
      contradictions: [
        {
          topic: 'Monto de la inversión',
          detail: 'Agencia nacional de noticias (prueba) informa "120 millones de dólares"; Diario internacional (prueba) informa "150 millones de dólares".',
          sourceIds: [agencia.id, diario.id],
        },
      ],
      checks: { ...checks, figures: 'flagged' },
    },
    review: {
      status: 'in_review',
      approvedBy: null,
      reviewedAt: null,
      notes: 'La configuración exige revisión humana para todo borrador. Las fuentes se contradicen. Confianza media, por debajo de la exigida.',
    },
  });

  const verified = note({
    slug: 'habilitan-el-nuevo-puente-sobre-el-rio-salado',
    title: 'Habilitan el nuevo puente sobre el río Salado tras dos años de obra',
    dek: 'El cruce une los dos barrios de la ribera y reemplaza a la balsa que funcionaba desde hace décadas.',
    category: 'sociedad',
    tags: ['obras públicas', 'transporte'],
    body: [
      { type: 'p', text: 'El municipio habilitó el nuevo puente sobre el río Salado, que une los dos barrios de la ribera.' },
      { type: 'h2', text: 'Qué cambia para quienes cruzan' },
      { type: 'p', text: 'Hasta ahora el cruce se hacía en balsa. El puente tiene dos carriles y una senda para bicicletas.' },
    ],
    sources: [municipio, local],
    verification: {
      status: 'verified',
      confidence: 'high',
      independentSources: 2,
      checkedAt: T0,
      claims: [{ id: 'p1', text: 'El municipio habilitó el puente.', status: 'confirmed', sourceIds: [municipio.id, local.id] }],
      contradictions: [],
      checks,
    },
    review: { status: 'in_review', approvedBy: null, reviewedAt: null, notes: 'La configuración exige revisión humana para todo borrador.' },
  });

  const published = note({
    slug: 'la-biblioteca-municipal-extiende-su-horario',
    title: 'La biblioteca municipal extiende su horario durante los exámenes',
    dek: 'Abrirá hasta la medianoche de lunes a viernes durante las tres semanas de mesas de examen.',
    category: 'sociedad',
    body: [{ type: 'p', text: 'La biblioteca municipal abrirá hasta la medianoche de lunes a viernes durante las mesas de examen.' }],
    sources: [biblioteca, radio],
    verification: {
      status: 'verified',
      confidence: 'high',
      independentSources: 2,
      checkedAt: T0,
      claims: [{ id: 'b1', text: 'La biblioteca abrirá hasta la medianoche.', status: 'confirmed', sourceIds: [biblioteca.id, radio.id] }],
      contradictions: [],
      checks,
    },
    review: { status: 'published', approvedBy: 'human', reviewedAt: T0 },
  });

  const rejected = note({
    slug: 'un-festival-de-cine-suma-una-sede-en-el-centro',
    title: 'Un festival de cine suma una sede en el centro',
    dek: 'La organización confirmó una sala más para las funciones de la noche, según un comunicado.',
    category: 'cultura',
    body: [{ type: 'p', text: 'El festival sumará una sala en el centro para las funciones de la noche.' }],
    sources: [source('local/festival-sede', 'Diario local (prueba)', 'local_media'), source('agencia/festival-sede', 'Agencia nacional de noticias (prueba)', 'news_agency')],
    verification: { status: 'partial', confidence: 'medium', independentSources: 2, checkedAt: T0, claims: [], contradictions: [], checks },
    review: { status: 'rejected', approvedBy: null, reviewedAt: T0 },
  });

  const row = (id: string, document: Article, minute: number): Row => ({
    id,
    document,
    writer: 'gemini:gemini-3.5-flash-lite',
    created_at: `2026-10-02T17:${String(minute).padStart(2, '0')}:00.000000+00:00`,
    updated_at: `2026-10-02T17:${String(minute).padStart(2, '0')}:30.123456+00:00`,
  });
  return [
    row('641d9163-672e-4ae1-8b8c-b054a6d3086a', disputed, 52),
    row('362c46a4-e42c-4366-8b9d-33e5ef97878b', verified, 49),
    row('a8f0c2e4-5b6d-4e7f-8a9b-0c1d2e3f4a5b', published, 30),
    row('b9e1d3f5-6c7e-4f80-9b0c-1d2e3f4a5b6c', rejected, 20),
  ];
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
  'access-control-expose-headers': 'content-range',
};

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** Un JWT con la forma correcta (la firma no se controla: lo lee solo este simulador). */
function accessToken(user: { id: string; email: string }): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp })}.firma`;
}

export class FakeSupabase {
  readonly rows: Row[];
  readonly editors = new Set([EDITOR.id]);
  /** Lo que la página mandó a guardar, en orden. */
  readonly saves: { id: string; document: Article }[] = [];
  private readonly sessions = new Map<string, string>();
  private clock = 0;

  constructor(rows: Row[] = fixtureRows()) {
    this.rows = rows;
  }

  async install(page: Page) {
    await page.route(/\/auth\/v1\//, (route) => this.auth(route));
    await page.route(/\/rest\/v1\//, (route) => this.rest(route));
  }

  row(id: string): Row {
    const found = this.rows.find((r) => r.id === id);
    if (!found) throw new Error(`No hay una nota ${id} en la base simulada.`);
    return found;
  }

  /** Simula que otra persona (u otra pestaña) guardó la nota. */
  touch(id: string) {
    this.row(id).updated_at = this.nextTimestamp();
  }

  private nextTimestamp(): string {
    this.clock += 1;
    return new Date(Date.UTC(2026, 9, 2, 19, 0, this.clock)).toISOString().replace('Z', '123+00:00');
  }

  private json(route: Route, status: number, body: unknown) {
    return route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  }

  private async auth(route: Route) {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const url = new URL(request.url());
    if (url.pathname.endsWith('/token')) {
      const body = request.postDataJSON() as { email?: string; password?: string };
      const user = [EDITOR, OUTSIDER].find((u) => u.email === body.email && u.password === body.password);
      if (!user) return this.json(route, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      const token = accessToken(user);
      this.sessions.set(token, user.id);
      return this.json(route, 200, {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: `renovar-${user.id}`,
        user: { id: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, app_metadata: {}, user_metadata: {}, created_at: T0 },
      });
    }
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204, headers: CORS });
    return this.json(route, 404, { msg: 'No simulado' });
  }

  private userOf(route: Route): string | null {
    const token = route.request().headers()['authorization']?.replace(/^Bearer /, '');
    return (token && this.sessions.get(token)) || null;
  }

  private async rest(route: Route) {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const url = new URL(request.url());
    const table = url.pathname.split('/').pop();
    const param = (name: string) => url.searchParams.get(name);
    const user = this.userOf(route);
    const isEditor = user !== null && this.editors.has(user);

    if (table === 'editors') {
      const wanted = param('user_id')?.replace(/^eq\./, '');
      return this.json(route, 200, isEditor && wanted === user ? [{ user_id: user }] : []);
    }
    if (table !== 'articles') return this.json(route, 404, { code: 'PGRST205', message: `No existe la tabla ${table}` });

    // Regla de acceso: quien no está en la redacción solo ve lo publicado (acá no hace falta más).
    const visible = this.rows.filter((r) => isEditor || r.document.review.status === 'published');
    const id = param('id')?.replace(/^eq\./, '');
    const statuses = param('status')?.match(/^in\.\((.*)\)$/)?.[1].split(',');
    const matching = visible.filter((r) => (!id || r.id === id) && (!statuses || statuses.includes(r.document.review.status)));

    if (request.method() === 'GET') {
      const sorted = [...matching].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
      return this.json(route, 200, sorted.map((r) => this.view(r)));
    }
    if (request.method() === 'PATCH') {
      const expected = param('updated_at')?.replace(/^eq\./, '');
      const target = matching.find((r) => r.updated_at === expected);
      if (!isEditor || !target) return this.json(route, 200, []);
      const { document } = request.postDataJSON() as { document: Article };
      const checked = this.applyRules(target.document, document, user);
      if ('error' in checked) return this.json(route, 400, { code: '23514', details: null, hint: null, message: checked.error });
      this.saves.push({ id: target.id, document });
      target.document = checked.document;
      target.updated_at = this.nextTimestamp();
      return this.json(route, 200, [this.view(target)]);
    }
    return this.json(route, 405, { message: 'No simulado' });
  }

  /** Lo esencial de `private.articles_reglas`. */
  private applyRules(before: Article, after: Article, editor: string | null): { document: Article } | { error: string } {
    const now = new Date(Date.UTC(2026, 9, 2, 19, 0, this.clock + 1)).toISOString();
    const was = before.review.status;
    let document = after;
    if (after.slug !== before.slug) return { error: 'La dirección de una nota no se cambia: rompería los enlaces que ya circulan.' };
    const content = (a: Article) => JSON.stringify({ ...a, review: null, updates: null, updatedAt: null });
    if (was === 'published' && after.review.status === 'published' && content(after) !== content(before)) {
      if (after.updates.length <= before.updates.length) {
        return { error: 'Una nota publicada solo se corrige agregando una nota de corrección al historial de cambios.' };
      }
      document = { ...document, updatedAt: now };
    }
    if (after.review.status === 'published') {
      if (after.verification.status === 'unverified') return { error: 'Una nota sin verificar no se publica.' };
      if (was !== 'published') {
        document = { ...document, publishedAt: now, updatedAt: now };
        if (editor) document = { ...document, review: { ...document.review, approvedBy: 'human', reviewedAt: now } };
      }
      if (after.verification.status === 'disputed' && document.review.approvedBy !== 'human') {
        return { error: 'Una nota con fuentes en disputa solo la publica una persona de la redacción.' };
      }
    }
    return { document };
  }

  private view(r: Row) {
    const d = r.document;
    return {
      id: r.id,
      slug: d.slug,
      status: d.review.status,
      title: d.title,
      category: d.category,
      is_demo: d.isDemo,
      writer: r.writer,
      created_at: r.created_at,
      updated_at: r.updated_at,
      published_at: d.publishedAt,
      verification: d.verification.status,
      document: d,
    };
  }
}
