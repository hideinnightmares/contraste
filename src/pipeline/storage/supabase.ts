import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { articleSchema } from '@/domain/schema';
import type { Article } from '@/domain/types';
import type { Publisher } from '../stages/publish';
import type { PipelineReport } from '../types';

/**
 * Almacenamiento del pipeline en Supabase (ver docs/BASE-DE-DATOS.md).
 *
 * Usa la clave secreta (`SUPABASE_SECRET_KEY`, rol service_role): solo corre en el
 * pipeline, en esta computadora (`.env.pipeline`) o en GitHub Actions (secreto). Nunca
 * en el sitio ni en el navegador. Ese rol puede leer, crear y actualizar notas e
 * informes, pero no borrar.
 */

/** Filas por pedido: PostgREST devuelve como máximo 1.000 por defecto. */
const PAGE = 1000;

/** Cliente con la clave secreta, o `null` si el pipeline no tiene base configurada. */
export function supabaseFromEnv(env: Record<string, string | undefined> = process.env): SupabaseClient | null {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SECRET_KEY?.trim();
  if (!url && !key) return null;
  if (!url || !key) {
    throw new Error('Falta SUPABASE_URL o SUPABASE_SECRET_KEY en .env.pipeline: hacen falta las dos para guardar en la base.');
  }
  if (!key.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_SECRET_KEY no es una clave secreta de Supabase (empieza con sb_secret_).');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** URL canónica de cada fuente citada → slug de la nota que la cita. */
export function coverageFromRows(rows: { slug: string; sources: unknown }[]): Map<string, string> {
  const covered = new Map<string, string>();
  for (const row of rows) {
    if (!Array.isArray(row.sources)) continue;
    for (const source of row.sources) {
      const url = (source as { url?: unknown }).url;
      if (typeof url === 'string' && url && !covered.has(url)) covered.set(url, row.slug);
    }
  }
  return covered;
}

export class SupabaseStore implements Publisher {
  /** Notas guardadas en esta corrida, para vincularlas con su informe. */
  private readonly saved: string[] = [];

  constructor(private readonly db: SupabaseClient) {}

  private async paged<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
    const all: T[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await query(from, from + PAGE - 1);
      if (error) throw new Error(`Supabase: ${error.message}`);
      all.push(...(data ?? []));
      if (!data || data.length < PAGE) return all;
    }
  }

  /** Todos los slugs usados, en cualquier estado: una dirección no se reutiliza nunca. */
  async existingSlugs(): Promise<Set<string>> {
    const rows = await this.paged<{ slug: string }>((from, to) => this.db.from('articles').select('slug').order('slug').range(from, to));
    return new Set(rows.map((r) => r.slug));
  }

  /** Fuentes citadas por notas de los últimos `days` días, en cualquier estado (también las descartadas). */
  async coveredSourceUrls(days = 7, now = new Date()): Promise<Map<string, string>> {
    const since = new Date(now.getTime() - days * 86_400_000).toISOString();
    const rows = await this.paged<{ slug: string; sources: unknown }>((from, to) =>
      this.db.from('articles').select('slug, sources:document->sources').gte('created_at', since).order('created_at').range(from, to),
    );
    return coverageFromRows(rows);
  }

  async save(article: Article, meta: { writer?: string } = {}): Promise<string> {
    const check = articleSchema.safeParse(article);
    if (!check.success) {
      throw new Error(`la nota no pasa la validación: ${check.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
    }
    const { data, error } = await this.db
      .from('articles')
      .insert({ document: article, writer: meta.writer ?? null })
      .select('id, slug, status')
      .single();
    if (error) throw new Error(`Supabase: ${error.message}`);
    this.saved.push(data.id);
    return `base de datos (${data.status})`;
  }

  /** Guarda el informe de la corrida y le asigna las notas guardadas en ella. Devuelve su id. */
  async recordRun(report: PipelineReport): Promise<string> {
    const { data, error } = await this.db
      .from('pipeline_runs')
      .insert({
        started_at: report.startedAt,
        finished_at: report.finishedAt,
        collected: report.collected,
        clusters: report.clusters,
        report,
      })
      .select('id')
      .single();
    if (error) throw new Error(`Supabase: no se pudo guardar el informe: ${error.message}`);
    if (this.saved.length > 0) {
      const link = await this.db.from('articles').update({ pipeline_run_id: data.id }).in('id', this.saved);
      if (link.error) throw new Error(`Supabase: no se pudieron vincular las notas al informe: ${link.error.message}`);
    }
    return data.id;
  }
}
