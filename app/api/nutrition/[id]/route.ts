/** DELETE /api/nutrition/[id] — Borra un registro de comida propio */
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { authed, ok, fail, serverError } from '@/lib/api/helpers';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const { id } = await params;
    const deleted = await getDb().deleteNutritionLog(auth.profileId, id);
    if (!deleted) return fail('Registro no encontrado', 404);
    return ok({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
