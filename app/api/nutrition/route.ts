/**
 * GET /api/nutrition?date= — Comidas del día (siempre marcadas como estimaciones)
 * POST /api/nutrition — { date, meal, description, waterMl? }
 */
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db';
import { nutritionLogSchema } from '@/lib/validation/schemas';
import { todayLocal } from '@/lib/services/report';
import { authed, ok, parse, serverError } from '@/lib/api/helpers';
import type { NutritionLog } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const date = req.nextUrl.searchParams.get('date') ?? todayLocal();
    const logs = await getDb().listNutritionLogs(auth.profileId, date);
    const waterMl = logs.reduce((s, l) => s + (l.waterMl ?? 0), 0);
    return ok({ date, logs, waterMl });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const json = await req.json().catch(() => ({}));
    const parsed = parse(nutritionLogSchema, json);
    if (!parsed.ok) return parsed.response;
    const log: NutritionLog = {
      id: randomUUID(),
      profileId: auth.profileId,
      date: parsed.data.date,
      meal: parsed.data.meal,
      description: parsed.data.description,
      waterMl: parsed.data.waterMl,
      isEstimate: true,
      createdAt: new Date().toISOString(),
    };
    const saved = await getDb().addNutritionLog(log);
    return ok({ log: saved }, 201);
  } catch (e) {
    return serverError(e);
  }
}
