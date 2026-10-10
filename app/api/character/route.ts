/**
 * GET /api/character — HUD del personaje: perfil, stats, progreso de nivel,
 * cosméticos desbloqueados y objetivo diario.
 */
import { getDb, dbMode } from '@/lib/db';
import { levelProgress } from '@/lib/gamification/levels';
import { COSMETIC_REWARDS } from '@/lib/gamification/config';
import { authed, ok, serverError } from '@/lib/api/helpers';

export async function GET() {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const db = getDb();
    const [profile, stats, settings, storyState] = await Promise.all([
      db.getProfile(auth.profileId),
      db.getStats(auth.profileId),
      db.getSettings(auth.profileId),
      db.getStoryState(auth.profileId),
    ]);
    if (!profile) return ok({ error: 'Perfil no encontrado' }, 404);

    const progress = levelProgress(stats.totalXp);
    const cosmetics = COSMETIC_REWARDS.map((c) => ({
      ...c,
      unlocked: storyState.unlockedCosmetics.includes(c.id) || stats.level >= c.unlockLevel,
    }));

    return ok({
      profile,
      stats,
      progress,
      cosmetics,
      dailyGoalXp: settings.dailyGoalXp,
      mode: dbMode(),
    });
  } catch (e) {
    return serverError(e);
  }
}
