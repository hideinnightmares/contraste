import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkConfig, checkDatabase, checkGemini } from '@/pipeline/check';
import { supabaseFromEnv } from '@/pipeline/storage/supabase';

/** Comprobación de las claves del pipeline (`npm run pipeline -- --verificar`), sin red. */

const KEY = 'clave-de-prueba';

function googleReturning(status: number, models: { name: string; methods?: string[] }[] = []) {
  const calls: { url: string; headers: Headers }[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), headers: new Headers(init?.headers) });
    const body = { models: models.map((m) => ({ name: `models/${m.name}`, supportedGenerationMethods: m.methods ?? ['generateContent'] })) };
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

describe('clave de Gemini', () => {
  it('sin clave, lo dice sin consultar a Google', async () => {
    const { fetchImpl, calls } = googleReturning(200);
    expect(await checkGemini({}, fetchImpl)).toEqual([{ ok: false, text: 'GEMINI_API_KEY no está cargada.' }]);
    expect(calls).toHaveLength(0);
  });

  it('con una clave válida, dice qué modelos de la cadena puede usar, y la clave no viaja en la dirección', async () => {
    const { fetchImpl, calls } = googleReturning(200, [
      { name: 'gemini-3.5-flash' },
      { name: 'gemini-3.5-flash-lite' },
      { name: 'text-embedding-005', methods: ['embedContent'] },
    ]);
    const lines = await checkGemini({ GEMINI_API_KEY: KEY }, fetchImpl);
    expect(lines.every((l) => l.ok)).toBe(true);
    expect(lines[1].text).toBe(
      'Modelos que puede usar el redactor, en orden: gemini-3.5-flash, gemini-3.5-flash-lite. No disponibles para esta clave (se saltean): gemini-3.8-flash, gemini-3.7-flash, gemini-3.6-flash, gemini-3-flash-preview, gemini-3.1-flash-lite.',
    );
    expect(calls[0].url).not.toContain(KEY);
    expect(calls[0].headers.get('x-goog-api-key')).toBe(KEY);
    expect(JSON.stringify(lines)).not.toContain(KEY);
  });

  it('respeta la cadena de CONTRASTE_GEMINI_MODELS y avisa si no puede usar ninguno', async () => {
    const { fetchImpl } = googleReturning(200, [{ name: 'gemini-9-pro' }]);
    const lines = await checkGemini({ GEMINI_API_KEY: KEY, CONTRASTE_GEMINI_MODELS: 'gemini-x-flash, gemini-y-flash' }, fetchImpl);
    expect(lines[1]).toEqual({
      ok: false,
      text: 'Ninguno de los modelos configurados está disponible para esta clave (gemini-x-flash, gemini-y-flash). La clave puede usar: gemini-9-pro. Ajustá CONTRASTE_GEMINI_MODELS.',
    });
  });

  it('una clave rechazada o un Google caído no pasan', async () => {
    expect((await checkGemini({ GEMINI_API_KEY: KEY }, googleReturning(400).fetchImpl))[0].text).toMatch(/Google la rechazó \(HTTP 400\)/);
    expect((await checkGemini({ GEMINI_API_KEY: KEY }, googleReturning(503).fetchImpl))[0].ok).toBe(false);
    const offline = (async () => {
      throw new Error('sin red');
    }) as typeof fetch;
    expect((await checkGemini({ GEMINI_API_KEY: KEY }, offline))[0]).toEqual({
      ok: false,
      text: 'GEMINI_API_KEY está cargada, pero no se pudo consultar a Google: sin red',
    });
  });
});

describe('clave secreta de Supabase', () => {
  const clientReturning = (result: { count: number | null; error: { message: string } | null }) => {
    const queries: { table: string; options: unknown }[] = [];
    const client = {
      from: (table: string) => ({
        select: async (_columns: string, options: unknown) => {
          queries.push({ table, options });
          return result;
        },
      }),
    } as unknown as SupabaseClient;
    return { client, queries };
  };

  it('sin clave, lo dice', async () => {
    expect(await checkDatabase({})).toEqual([{ ok: false, text: 'SUPABASE_SECRET_KEY no está cargada.' }]);
  });

  it('una clave que no es la secreta no pasa', async () => {
    const lines = await checkDatabase({ SUPABASE_URL: 'https://base.test', SUPABASE_SECRET_KEY: 'sb_publishable_x' }, supabaseFromEnv);
    expect(lines).toEqual([{ ok: false, text: 'SUPABASE_SECRET_KEY no es una clave secreta de Supabase (empieza con sb_secret_).' }]);
  });

  it('con la clave correcta solo cuenta notas, sin leerlas ni cambiarlas', async () => {
    const { client, queries } = clientReturning({ count: 7, error: null });
    expect(await checkDatabase({}, () => client)).toEqual([{ ok: true, text: 'SUPABASE_SECRET_KEY está cargada y la base responde (7 notas guardadas).' }]);
    expect(queries).toEqual([{ table: 'articles', options: { count: 'exact', head: true } }]);
  });

  it('si la base rechaza la clave, lo dice', async () => {
    const { client } = clientReturning({ count: null, error: { message: 'Invalid API key' } });
    expect(await checkDatabase({}, () => client)).toEqual([
      { ok: false, text: 'SUPABASE_SECRET_KEY está cargada, pero la base no la aceptó o no respondió: Invalid API key' },
    ]);
  });
});

describe('comprobación completa', () => {
  it('junta las dos comprobaciones', async () => {
    const lines = await checkConfig({}, { connect: () => null });
    expect(lines.map((l) => l.text)).toEqual(['GEMINI_API_KEY no está cargada.', 'SUPABASE_SECRET_KEY no está cargada.']);
  });
});
