/** POST /api/auth/logout — Cierra la sesión demo */
import { clearSession } from '@/lib/auth/session';
import { ok, serverError } from '@/lib/api/helpers';

export async function POST() {
  try {
    await clearSession();
    return ok({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
