/**
 * POST /api/progress/weight — Registra una entrada de progreso corporal (peso opcional).
 * Body: { date, weightKg?, notes? }
 */
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db';
import { bodyProgressSchema } from '@/lib/validation/schemas';
import { authed, ok, parse, serverError } from '@/lib/api/helpers';
import type { BodyProgressEntry } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const json = await req.json().catch(() => ({}));
    const parsed = parse(bodyProgressSchema, json);
    if (!parsed.ok) return parsed.response;
    const entry: BodyProgressEntry = {
      id: randomUUID(),
      profileId: auth.profileId,
      date: parsed.data.date,
      weightKg: parsed.data.weightKg,
      notes: parsed.data.notes,
      mediaId: parsed.data.mediaId,
      createdAt: new Date().toISOString(),
    };
    const saved = await getDb().addBodyProgress(entry);
    return ok({ entry: saved }, 201);
  } catch (e) {
    return serverError(e);
  }
}
