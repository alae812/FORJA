/**
 * GET /api/settings — Ajustes del héroe
 * PUT /api/settings — Actualiza ajustes (objetivo diario, hábitos, descansos, efectos)
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { settingsSchema } from '@/lib/validation/schemas';
import { authed, ok, parse, serverError } from '@/lib/api/helpers';

export async function GET() {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const settings = await getDb().getSettings(auth.profileId);
    return ok({ settings });
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const json = await req.json().catch(() => ({}));
    const parsed = parse(settingsSchema, json);
    if (!parsed.ok) return parsed.response;
    const db = getDb();
    const settings = await db.updateSettings(auth.profileId, parsed.data);
    await db.updateProfile(auth.profileId, { dailyGoalXp: parsed.data.dailyGoalXp });
    return ok({ settings });
  } catch (e) {
    return serverError(e);
  }
}
