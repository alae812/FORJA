/**
 * GET /api/habits?date= — Hábitos configurados + checks del día
 * POST /api/habits — { date, habitId, done }
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { habitCheckSchema } from '@/lib/validation/schemas';
import { todayLocal } from '@/lib/services/report';
import { authed, ok, parse, serverError } from '@/lib/api/helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const date = req.nextUrl.searchParams.get('date') ?? todayLocal();
    const db = getDb();
    const settings = await db.getSettings(auth.profileId);
    const checks = await db.getHabitChecks(auth.profileId, date);
    const done = new Set(checks.filter((c) => c.done).map((c) => c.habitId));
    return ok({
      date,
      habits: settings.habits
        .filter((h) => h.enabled)
        .map((h) => ({ ...h, done: done.has(h.id) })),
    });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const json = await req.json().catch(() => ({}));
    const parsed = parse(habitCheckSchema, json);
    if (!parsed.ok) return parsed.response;
    await getDb().setHabitCheck({
      profileId: auth.profileId,
      date: parsed.data.date,
      habitId: parsed.data.habitId,
      done: parsed.data.done,
    });
    return ok({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
