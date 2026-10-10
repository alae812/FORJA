/**
 * GET /api/report?date=YYYY-MM-DD — Construye (y guarda) el Report Card del día.
 * Sin fecha => hoy.
 */
import { NextRequest } from 'next/server';
import { buildDailyReport, todayLocal } from '@/lib/services/report';
import { authed, ok, fail, serverError } from '@/lib/api/helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const date = req.nextUrl.searchParams.get('date') ?? todayLocal();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Fecha inválida', 422);
    const report = await buildDailyReport(auth.profileId, date);
    return ok({ report });
  } catch (e) {
    return serverError(e);
  }
}
