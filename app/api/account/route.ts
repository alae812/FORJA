/**
 * GET /api/export — Exporta todos los datos del héroe en JSON (descarga).
 * DELETE /api/account — Elimina TODOS los datos del héroe (derecho de supresión)
 * y cierra la sesión. Acción irreversible: la UI pide confirmación doble.
 */
import { getDb } from '@/lib/db';
import { clearSession } from '@/lib/auth/session';
import { authed, ok, serverError } from '@/lib/api/helpers';

export async function GET() {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const data = await getDb().exportProfileData(auth.profileId);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'content-type': 'application/json',
        'content-disposition': `attachment; filename="forja-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE() {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    await getDb().deleteProfileData(auth.profileId);
    await clearSession();
    return ok({ ok: true, deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
