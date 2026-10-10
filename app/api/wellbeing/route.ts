/**
 * GET /api/wellbeing?date= — Energía autodeclarada del día (1–5)
 * POST /api/wellbeing — { date, energy, notes? }
 */
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { todayLocal } from '@/lib/services/report';
import { authed, ok, parse, serverError } from '@/lib/api/helpers';
import type { WellbeingLog } from '@/types';

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  energy: z.number().int().min(1).max(5),
  notes: z.string().trim().max(300).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const date = req.nextUrl.searchParams.get('date') ?? todayLocal();
    const log = await getDb().getWellbeingLog(auth.profileId, date);
    return ok({ log, date });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const json = await req.json().catch(() => ({}));
    const parsed = parse(bodySchema, json);
    if (!parsed.ok) return parsed.response;
    const log: WellbeingLog = {
      id: randomUUID(),
      profileId: auth.profileId,
      date: parsed.data.date,
      energy: parsed.data.energy as 1 | 2 | 3 | 4 | 5,
      notes: parsed.data.notes,
      createdAt: new Date().toISOString(),
    };
    const saved = await getDb().upsertWellbeingLog(log);
    return ok({ log: saved }, 201);
  } catch (e) {
    return serverError(e);
  }
}
