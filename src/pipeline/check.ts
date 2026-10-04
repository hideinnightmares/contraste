import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_GEMINI_MODELS } from './writers/gemini';
import { supabaseFromEnv } from './storage/supabase';

/**
 * Comprobación de las claves del pipeline, sin redactar ni guardar nada
 * (`npm run pipeline -- --verificar` y la opción "Solo comprobar las claves" del flujo
 * Pipeline de noticias):
 *
 * - que GEMINI_API_KEY esté cargada, que Google la acepte y qué modelos de la cadena puede usar;
 * - que SUPABASE_SECRET_KEY esté cargada y la base responda con ella (una lectura que no cambia nada).
 *
 * Nunca muestra las claves.
 */

export interface CheckLine {
  ok: boolean;
  text: string;
}

type Env = Record<string, string | undefined>;

const GEMINI_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000';
const TIMEOUT_MS = 20_000;

/** Los modelos que va a probar el redactor, en orden (como en writers/gemini.ts). */
function geminiChain(env: Env): string[] {
  const fromEnv = env.CONTRASTE_GEMINI_MODELS?.split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_GEMINI_MODELS;
}

export async function checkGemini(env: Env, fetchImpl: typeof fetch = fetch): Promise<CheckLine[]> {
  const key = env.GEMINI_API_KEY?.trim();
  if (!key) return [{ ok: false, text: 'GEMINI_API_KEY no está cargada.' }];

  let res: Response;
  try {
    // La clave va en un encabezado, no en la dirección: así no queda en ningún registro.
    res = await fetchImpl(GEMINI_MODELS_URL, { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    return [{ ok: false, text: `GEMINI_API_KEY está cargada, pero no se pudo consultar a Google: ${(err as Error).message}` }];
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    return [{ ok: false, text: `GEMINI_API_KEY está cargada, pero Google la rechazó (HTTP ${res.status}). Revisala en Google AI Studio.` }];
  }
  if (!res.ok) return [{ ok: false, text: `GEMINI_API_KEY está cargada, pero Google respondió HTTP ${res.status} al listar los modelos.` }];

  const data = (await res.json()) as { models?: { name?: string; supportedGenerationMethods?: string[] }[] };
  const available = new Set(
    (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => (m.name ?? '').replace(/^models\//, ''))
      .filter(Boolean),
  );
  const chain = geminiChain(env);
  const usable = chain.filter((m) => available.has(m));
  const missing = chain.filter((m) => !available.has(m));
  const lines: CheckLine[] = [{ ok: true, text: 'GEMINI_API_KEY está cargada y Google la acepta.' }];
  if (usable.length === 0) {
    const gemini = [...available].filter((m) => m.startsWith('gemini')).slice(0, 12);
    lines.push({
      ok: false,
      text: `Ninguno de los modelos configurados está disponible para esta clave (${chain.join(', ')}). La clave puede usar: ${gemini.join(', ') || 'ninguno de Gemini'}. Ajustá CONTRASTE_GEMINI_MODELS.`,
    });
  } else {
    lines.push({
      ok: true,
      text: `Modelos que puede usar el redactor, en orden: ${usable.join(', ')}.${missing.length > 0 ? ` No disponibles para esta clave (se saltean): ${missing.join(', ')}.` : ''}`,
    });
  }
  return lines;
}

export async function checkDatabase(env: Env, connect: (env: Env) => SupabaseClient | null = supabaseFromEnv): Promise<CheckLine[]> {
  let db: SupabaseClient | null;
  try {
    db = connect(env);
  } catch (err) {
    return [{ ok: false, text: (err as Error).message }];
  }
  if (!db) return [{ ok: false, text: 'SUPABASE_SECRET_KEY no está cargada.' }];

  // Solo cuenta notas: no lee contenido ni cambia nada.
  const { count, error } = await db.from('articles').select('id', { count: 'exact', head: true });
  if (error) {
    return [{ ok: false, text: `SUPABASE_SECRET_KEY está cargada, pero la base no la aceptó o no respondió: ${error.message || 'sin detalle'}` }];
  }
  return [{ ok: true, text: `SUPABASE_SECRET_KEY está cargada y la base responde (${count ?? 0} notas guardadas).` }];
}

export async function checkConfig(env: Env, deps: { fetchImpl?: typeof fetch; connect?: (env: Env) => SupabaseClient | null } = {}): Promise<CheckLine[]> {
  const [gemini, database] = await Promise.all([checkGemini(env, deps.fetchImpl), checkDatabase(env, deps.connect)]);
  return [...gemini, ...database];
}
