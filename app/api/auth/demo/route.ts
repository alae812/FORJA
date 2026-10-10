/**
 * POST /api/auth/demo — Crea o recupera un perfil de héroe (modo demo).
 * Body: { heroName?: string, profileId?: string }
 * Establece la cookie de sesión httpOnly.
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { setSessionProfileId, getSessionProfileId } from '@/lib/auth/session';
import { heroNameSchema } from '@/lib/validation/schemas';
import { ok, fail, parse, serverError } from '@/lib/api/helpers';

const bodySchema = z.object({
  heroName: heroNameSchema.optional(),
  profileId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = parse(bodySchema, json);
    if (!parsed.ok) return parsed.response;
    const db = getDb();

    // Sesión existente válida
    if (parsed.data.profileId) {
      const existing = await db.getProfile(parsed.data.profileId);
      if (existing) {
        await setSessionProfileId(existing.id);
        return ok({ profile: existing });
      }
    }
    const current = await getSessionProfileId();
    if (current) {
      const existing = await db.getProfile(current);
      if (existing) return ok({ profile: existing });
    }

    if (!parsed.data.heroName) {
      return fail('Indica un nombre de héroe para crear tu perfil', 422);
    }
    const taken = await db.getProfileByHeroName(parsed.data.heroName);
    if (taken) {
      await setSessionProfileId(taken.id);
      return ok({ profile: taken, reused: true });
    }
    const profile = await db.createProfile({ heroName: parsed.data.heroName });
    await setSessionProfileId(profile.id);
    return ok({ profile }, 201);
  } catch (e) {
    return serverError(e);
  }
}
