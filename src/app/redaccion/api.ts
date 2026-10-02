'use client';

import type { Session } from '@supabase/supabase-js';
import type { Article, ReviewStatus } from '@/domain/types';
import { browserSupabase } from '@/lib/supabase/browser';

/**
 * Lo que la mesa le pide a la base. Corre en el navegador con la sesión del editor: las
 * reglas de la base (RLS y triggers) deciden qué se puede leer y cambiar, no esta pantalla.
 */

export interface DraftRow {
  id: string;
  slug: string;
  status: ReviewStatus;
  title: string;
  category: string;
  isDemo: boolean;
  writer: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  verification: string | null;
}

export interface LoadedDraft {
  id: string;
  updatedAt: string;
  writer: string | null;
  article: Article;
}

export class DeskError extends Error {
  constructor(
    message: string,
    readonly kind: 'conflict' | 'rules' | 'network' | 'auth' | 'other' = 'other',
  ) {
    super(message);
  }
}

/** Traduce un error de Supabase/PostgREST a un mensaje para la redacción. */
function deskError(error: { message: string; code?: string }): DeskError {
  if (error.code === '23514') {
    // check_violation: las reglas de publicación tienen su propio mensaje; la del formato, no.
    if (error.message.includes('articles_documento_valido')) {
      return new DeskError('La base rechazó la nota porque no tiene el formato esperado. Revisá los campos marcados.', 'rules');
    }
    return new DeskError(error.message, 'rules');
  }
  if (error.code === '42501' || error.code === 'PGRST301') {
    return new DeskError('Tu usuario no tiene permiso para hacer esto. Volvé a iniciar sesión.', 'auth');
  }
  if (/fetch|network|Failed to fetch/i.test(error.message)) {
    return new DeskError('No hay conexión con la base. Revisá tu red y probá de nuevo.', 'network');
  }
  return new DeskError(`La base respondió con un error: ${error.message}`);
}

export async function currentSession(): Promise<Session | null> {
  const { data, error } = await browserSupabase().auth.getSession();
  if (error) throw deskError(error);
  return data.session;
}

export function onSessionChange(callback: (session: Session | null) => void): () => void {
  const { data } = browserSupabase().auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await browserSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) throw new DeskError('El email o la contraseña no son correctos.', 'auth');
    if (/rate limit|too many/i.test(error.message)) throw new DeskError('Hubo demasiados intentos. Esperá unos minutos y probá de nuevo.', 'auth');
    throw deskError(error);
  }
}

export async function signOut(): Promise<void> {
  await browserSupabase().auth.signOut();
}

// ─── Verificación en dos pasos ─────────────────────────────────────────────────
// La base solo deja leer y cambiar notas con una sesión que pasó el segundo paso (aal2,
// migración 20261002211500_verificacion_en_dos_pasos.sql). Con la contraseña sola (aal1) la
// mesa pide el código de la app de autenticación, o la configura la primera vez.

export type AssuranceLevel = 'aal1' | 'aal2' | null;

/** Nivel de la sesión actual y el que puede alcanzar (aal2 si ya tiene la app configurada). */
export async function assuranceLevel(): Promise<{ current: AssuranceLevel; next: AssuranceLevel }> {
  const { data, error } = await browserSupabase().auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw deskError(error);
  return { current: data.currentLevel as AssuranceLevel, next: data.nextLevel as AssuranceLevel };
}

/** Id de la app de autenticación ya configurada, o `null`. */
export async function verifiedFactorId(): Promise<string | null> {
  const { data, error } = await browserSupabase().auth.mfa.listFactors();
  if (error) throw deskError(error);
  return data.totp[0]?.id ?? null;
}

export interface Enrollment {
  factorId: string;
  /** Código QR como imagen (data URL de un SVG). */
  qrCode: string;
  /** La misma clave, para escribirla a mano si no se puede escanear. */
  secret: string;
}

/** Empieza a configurar la app de autenticación. Un alta que quedó a medias se descarta. */
export async function startEnrollment(): Promise<Enrollment> {
  const mfa = browserSupabase().auth.mfa;
  const { data: factors, error: listError } = await mfa.listFactors();
  if (listError) throw deskError(listError);
  for (const factor of factors.all.filter((f) => f.factor_type === 'totp' && f.status !== 'verified')) {
    const { error } = await mfa.unenroll({ factorId: factor.id });
    if (error) throw deskError(error);
  }
  const { data, error } = await mfa.enroll({ factorType: 'totp', friendlyName: 'Mesa de redacción', issuer: 'Contraste' });
  if (error) {
    if (/disabled|not enabled/i.test(error.message)) {
      throw new DeskError('La verificación en dos pasos está desactivada en Supabase (Authentication > Multi-Factor).', 'auth');
    }
    throw deskError(error);
  }
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Comprueba el código de la app. Si es correcto, la sesión pasa a aal2 y Supabase lo avisa. */
export async function verifyCode(factorId: string, code: string): Promise<void> {
  const { error } = await browserSupabase().auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') });
  if (!error) return;
  if (error.code === 'mfa_verification_failed' || /invalid totp/i.test(error.message)) {
    throw new DeskError('El código no es correcto o ya cambió. Probá con el que muestra ahora la app.', 'auth');
  }
  if (error.code === 'mfa_challenge_expired') throw new DeskError('El código venció. Probá con el que muestra ahora la app.', 'auth');
  if (/rate limit|too many/i.test(error.message)) throw new DeskError('Hubo demasiados intentos. Esperá unos minutos y probá de nuevo.', 'auth');
  throw deskError(error);
}

/** ¿La persona con sesión está en la redacción? (la regla de la base solo le deja ver su propia fila). */
export async function isEditor(userId: string): Promise<boolean> {
  const { data, error } = await browserSupabase().from('editors').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) throw deskError(error);
  return Boolean(data);
}

const LIST_COLUMNS =
  'id, slug, status, title, category, is_demo, writer, created_at, updated_at, published_at, verification:document->verification->>status';

export async function listDrafts(statuses: ReviewStatus[]): Promise<DraftRow[]> {
  const { data, error } = await browserSupabase()
    .from('articles')
    .select(LIST_COLUMNS)
    .in('status', statuses)
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) throw deskError(error);
  return (data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    status: r.status,
    title: r.title,
    category: r.category,
    isDemo: r.is_demo,
    writer: r.writer,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    publishedAt: r.published_at,
    verification: r.verification,
  }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadDraft(id: string): Promise<LoadedDraft | null> {
  // Una dirección mal copiada no es un error de la base: esa nota no existe.
  if (!UUID.test(id)) return null;
  const { data, error } = await browserSupabase().from('articles').select('id, updated_at, writer, document').eq('id', id).maybeSingle();
  if (error) throw deskError(error);
  if (!data) return null;
  return { id: data.id, updatedAt: data.updated_at, writer: data.writer, article: data.document as Article };
}

/**
 * Guarda la nota solo si nadie la cambió desde que se abrió (`expectedUpdatedAt`). Devuelve
 * la versión que quedó en la base, con lo que agregó el servidor (fechas, quién aprobó).
 */
export async function saveDraft(id: string, expectedUpdatedAt: string, article: Article): Promise<LoadedDraft> {
  const { data, error } = await browserSupabase()
    .from('articles')
    .update({ document: article })
    .eq('id', id)
    .eq('updated_at', expectedUpdatedAt)
    .select('id, updated_at, writer, document');
  if (error) throw deskError(error);
  if (!data || data.length === 0) {
    throw new DeskError(
      'La nota cambió desde que la abriste (en otra pestaña, otra persona o el pipeline) y no se guardó nada, para no pisar esos cambios. Copiá lo que quieras conservar y recargala para ver la última versión.',
      'conflict',
    );
  }
  const row = data[0];
  return { id: row.id, updatedAt: row.updated_at, writer: row.writer, article: row.document as Article };
}
