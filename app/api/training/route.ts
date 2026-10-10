/**
 * GET /api/training — Lista sesiones (filtros: from, to, status, limit, offset)
 * POST /api/training — Registra una sesión (idempotente por idempotencyKey).
 * La XP se calcula SIEMPRE en el servidor; el cliente nunca la envía.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { createTrainingSession } from '@/lib/services/training';
import { createSessionSchema } from '@/lib/validation/schemas';
import { authed, ok, parse, serverError } from '@/lib/api/helpers';
import type { SessionStatus } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const q = req.nextUrl.searchParams;
    const status = q.get('status') as SessionStatus | null;
    const sessions = await getDb().listSessions(auth.profileId, {
      from: q.get('from') ?? undefined,
      to: q.get('to') ?? undefined,
      status: status && ['planned', 'completed', 'cancelled'].includes(status) ? status : undefined,
      limit: Math.min(100, Math.max(1, Number(q.get('limit') ?? 20))),
      offset: Math.max(0, Number(q.get('offset') ?? 0)),
    });
    return ok({ sessions });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const json = await req.json().catch(() => ({}));
    const parsed = parse(createSessionSchema, json);
    if (!parsed.ok) return parsed.response;

    const result = await createTrainingSession(auth.profileId, parsed.data);
    return ok(
      {
        session: result.session,
        deduped: result.deduped,
        levelUps: result.levelUps,
        capped: result.capped,
        storyTriggers: result.storyTriggers,
        dailyGoalAwarded: result.dailyGoalAwarded,
      },
      result.deduped ? 200 : 201,
    );
  } catch (e) {
    return serverError(e);
  }
}
