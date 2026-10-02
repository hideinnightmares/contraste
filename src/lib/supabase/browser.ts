'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Cliente de Supabase para el navegador (mesa de redacción), con la clave publicable.
 *
 * Sin iniciar sesión solo lee notas publicadas. Con el usuario de un editor puede lo que le
 * permiten las reglas de la base (ver docs/BASE-DE-DATOS.md): toda la seguridad está en la
 * base, no en esta pantalla. La sesión se guarda en este navegador.
 */
export function browserSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  return client;
}
