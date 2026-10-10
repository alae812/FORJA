/**
 * POST /api/onboarding — Completa el onboarding del héroe.
 * Crea el perfil (o lo actualiza), marca onboardingDone y abre la sesión.
 * Dispara el evento narrativo 'onboarding_complete' (la UI lo recoge).
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { setSessionProfileId } from '@/lib/auth/session';
import { profileSchema } from '@/lib/validation/schemas';
import { ok, fail, parse, serverError } from '@/lib/api/helpers';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = parse(profileSchema, json);
    if (!parsed.ok) return parsed.response;
    const db = getDb();
    const { heroName, combatStyle, dailyGoalXp } = parsed.data;

    let profile = await db.getProfileByHeroName(heroName);
    if (!profile) {
      profile = await db.createProfile({ heroName, combatStyle });
    }
    profile = await db.updateProfile(profile.id, {
      heroName,
      combatStyle,
      dailyGoalXp,
      onboardingDone: true,
    });
    await db.updateSettings(profile.id, { dailyGoalXp });
    await setSessionProfileId(profile.id);
    return ok({ profile, storyTrigger: 'onboarding_complete' }, 201);
  } catch (e) {
    if (e instanceof Error && e.message.includes('duplicate')) {
      return fail('Ese nombre de héroe ya existe', 409);
    }
    return serverError(e);
  }
}
