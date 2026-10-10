/**
 * GET /api/progress?days= — Historial: XP por día, sesiones, atributos y progreso corporal.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getXpHistory } from '@/lib/services/training';
import { authed, ok, serverError } from '@/lib/api/helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get('days') ?? 30)));
    const db = getDb();
    const [xpByDay, sessions, stats, bodyProgress] = await Promise.all([
      getXpHistory(auth.profileId, days),
      db.listSessions(auth.profileId, { limit: 200 }),
      db.getStats(auth.profileId),
      db.listBodyProgress(auth.profileId, 60),
    ]);
    const completed = sessions.filter((s) => s.status === 'completed');
    return ok({
      xpByDay,
      totalSessions: completed.length,
      totalXp: stats.totalXp,
      attributes: { str: stats.xpStr, sta: stats.xpSta, wis: stats.xpWis },
      bodyProgress,
      recentSessions: sessions.slice(0, 10),
    });
  } catch (e) {
    return serverError(e);
  }
}
