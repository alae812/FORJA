/**
 * GET /api/training/[id] — Detalle de sesión
 * PATCH /api/training/[id] — Edita (revierte XP anterior y aplica la nueva)
 * DELETE /api/training/[id] — Elimina revirtiendo la XP de forma auditable
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import {
  deleteTrainingSession,
  updateTrainingSession,
} from '@/lib/services/training';
import { updateSessionSchema } from '@/lib/validation/schemas';
import { authed, ok, fail, parse, serverError } from '@/lib/api/helpers';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const { id } = await params;
    const session = await getDb().getSession(auth.profileId, id);
    if (!session) return fail('Sesión no encontrada', 404);
    return ok({ session });
  } catch (e) {
    return serverError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const { id } = await params;
    const json = await req.json().catch(() => ({}));
    const parsed = parse(updateSessionSchema, json);
    if (!parsed.ok) return parsed.response;

    const result = await updateTrainingSession(auth.profileId, id, parsed.data);
    if (!result) return fail('Sesión no encontrada o ya eliminada', 404);
    return ok(result);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const { id } = await params;
    const result = await deleteTrainingSession(auth.profileId, id);
    if (!result) return fail('Sesión no encontrada o ya eliminada', 404);
    return ok({ ok: true, reversedXp: result.reversedXp });
  } catch (e) {
    return serverError(e);
  }
}
