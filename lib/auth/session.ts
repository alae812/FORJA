/**
 * FORJA — Sesión de autenticación.
 *
 * Modo demo (sin Supabase): cookie httpOnly `forja_session` con el id del perfil.
 * Con Supabase configurado, este módulo puede extenderse a @supabase/ssr;
 * la interfaz (profileId de la sesión) no cambia para el resto de la app.
 */
import { cookies } from 'next/headers';

const COOKIE_NAME = 'forja_session';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function getSessionProfileId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

export async function setSessionProfileId(profileId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, profileId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export class UnauthorizedError extends Error {
  constructor() {
    super('No autenticado');
    this.name = 'UnauthorizedError';
  }
}

/** Devuelve el profileId de la sesión o lanza UnauthorizedError */
export async function requireProfileId(): Promise<string> {
  const id = await getSessionProfileId();
  if (!id) throw new UnauthorizedError();
  return id;
}
