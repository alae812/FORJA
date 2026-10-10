import { getDb } from '@/lib/db';
import { requirePageProfile } from '@/lib/auth/page';
import { COSMETIC_REWARDS } from '@/lib/gamification/config';
import { Card } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/primitives';

const KIND_ICON: Record<string, string> = {
  aura: '✨',
  marco: '🖼️',
  titulo: '👑',
};

// Ruta autenticada: se renderiza en el servidor por petici00f3n (no prerender).
export const instant = false;

export default async function RecompensasPage() {
  const profile = await requirePageProfile();
  const db = getDb();
  const [stats, storyState] = await Promise.all([
    db.getStats(profile.id),
    db.getStoryState(profile.id),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black">🎁 Recompensas</h1>
      <p className="text-sm text-mist -mt-2">
        Cosméticos desbloqueados por nivel. Son adornos de tu HUD: no cambian tu fuerza real,
        solo celebran tu constancia.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {COSMETIC_REWARDS.map((c) => {
          const unlocked =
            storyState.unlockedCosmetics.includes(c.id) || stats.level >= c.unlockLevel;
          return (
            <Card
              key={c.id}
              glow={unlocked ? 'violet' : undefined}
              className={unlocked ? '' : 'opacity-50'}
            >
              <div className="text-3xl mb-2" aria-hidden>
                {unlocked ? KIND_ICON[c.kind] : '🔒'}
              </div>
              <p className="font-display font-bold text-sm">{c.name}</p>
              <p className="text-xs text-mist mb-2">{c.description}</p>
              <Badge color={unlocked ? 'ember' : 'gray'}>
                {unlocked ? 'Desbloqueado' : `Nivel ${c.unlockLevel}`}
              </Badge>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
