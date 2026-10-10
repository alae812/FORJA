/**
 * FORJA — Helpers para Route Handlers.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireProfileId, UnauthorizedError } from '@/lib/auth/session';

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Devuelve el profileId de la sesión o una respuesta 401 */
export async function authed(): Promise<{ profileId: string } | { response: NextResponse }> {
  try {
    const profileId = await requireProfileId();
    return { profileId };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { response: fail('No autenticado', 401) };
    throw e;
  }
}

export function parse<T>(
  schema: z.ZodType<T>,
  body: unknown,
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return { ok: false, response: fail('Datos inválidos', 422, { issues }) };
  }
  return { ok: true, data: result.data };
}

/** Manejo uniforme de errores inesperados (sin filtrar secretos) */
export function serverError(e: unknown): NextResponse {
  console.error('[forja] error interno:', e instanceof Error ? e.message : e);
  return fail('Error interno del servidor', 500);
}
