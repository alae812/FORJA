/**
 * GET /api/sleep?date=&from=&to= — Registro del día o rango
 * POST /api/sleep — { date, bedTime, wakeTime, quality, notes? }
 * La duración se calcula en el servidor (admite pasar la medianoche).
 */
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db';
import { sleepLogSchema } from '@/lib/validation/schemas';
import { todayLocal } from '@/lib/services/report';
import { authed, ok, parse, serverError } from '@/lib/api/helpers';
import type { SleepLog } from '@/types';

function durationMin(bedTime: string, wakeTime: string): number {
  const [bh, bm] = bedTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60; // pasó la medianoche
  return mins;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const q = req.nextUrl.searchParams;
    const db = getDb();
    const from = q.get('from');
    const to = q.get('to');
    if (from && to) {
      const logs = await db.listSleepLogs(auth.profileId, from, to);
      return ok({ logs });
    }
    const date = q.get('date') ?? todayLocal();
    const log = await db.getSleepLog(auth.profileId, date);
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
    const parsed = parse(sleepLogSchema, json);
    if (!parsed.ok) return parsed.response;
    const { date, bedTime, wakeTime, quality, notes } = parsed.data;
    const log: SleepLog = {
      id: randomUUID(),
      profileId: auth.profileId,
      date,
      bedTime,
      wakeTime,
      durationMin: durationMin(bedTime, wakeTime),
      quality: quality as 1 | 2 | 3 | 4 | 5,
      notes,
      createdAt: new Date().toISOString(),
    };
    const saved = await getDb().upsertSleepLog(log);
    return ok({ log: saved }, 201);
  } catch (e) {
    return serverError(e);
  }
}
