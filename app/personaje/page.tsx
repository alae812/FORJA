import Link from 'next/link';
import { getDb } from '@/lib/db';
import { requirePageProfile } from '@/lib/auth/page';
import { levelProgress } from '@/lib/gamification/levels';
import { COSMETIC_REWARDS } from '@/lib/gamification/config';
import { CharacterHud, AttributeCard } from '@/components/character/CharacterHud';
import { XpBar } from '@/components/ui/XpBar';
import { Card, SectionTitle, Badge } from '@/components/ui/primitives';

// Ruta autenticada: se renderiza en el servidor por petici00f3n (no prerender).
export const instant = false;

export default async function PersonajePage() {
  const profile = await requirePageProfile();
  const db = getDb();
  const [stats] = await Promise.all([db.getStats(profile.id)]);
  const progress = levelProgress(stats.totalXp);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black">🧝 Mi héroe</h1>

      <CharacterHud
        heroName={profile.heroName}
        level={progress.level}
        progress={progress.progress}
        xpIntoLevel={progress.xpIntoLevel}
        xpForNextLevel={progress.xpForNextLevel}
        combatStyle={profile.combatStyle}
      />

      <div>
        <SectionTitle>Atributos</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <AttributeCard attr="str" xp={stats.xpStr} delay={0} />
          <AttributeCard attr="sta" xp={stats.xpSta} delay={0.08} />
          <AttributeCard attr="wis" xp={stats.xpWis} delay={0.16} />
        </div>
        <p className="text-xs text-mist mt-2">
          STR sube con fuerza · STA con cardio · WIS con técnica, movilidad y constancia.
        </p>
      </div>

      <Card>
        <SectionTitle
          action={
            <Link href="/recompensas" className="text-sm text-neon-cyan font-bold">
              Ver todas →
            </Link>
          }
        >
          🎁 Últimas recompensas
        </SectionTitle>
        <div className="space-y-2">
          {COSMETIC_REWARDS.filter((c) => stats.level >= c.unlockLevel).slice(-3).map((c) => (
            <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <div>
                <p className="font-bold text-sm">{c.name}</p>
                <p className="text-xs text-mist">{c.description}</p>
              </div>
              <Badge color="ember">Nv {c.unlockLevel}</Badge>
            </div>
          ))}
          {COSMETIC_REWARDS.every((c) => stats.level < c.unlockLevel) && (
            <p className="text-sm text-mist">
              Sube al nivel 2 para desbloquear tu primera recompensa cosmética.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-display font-bold mb-2">📊 Total forjado</h3>
        <p className="font-display text-3xl font-black text-glow-violet">
          {Math.round(stats.totalXp)} XP
        </p>
        <div className="mt-3">
          <XpBar progress={progress.progress} />
        </div>
        <p className="text-xs text-mist mt-2">
          Nivel {progress.level} → {progress.level + 1}: {Math.round(progress.xpIntoLevel)}/
          {Math.round(progress.xpForNextLevel)} XP
        </p>
      </Card>
    </div>
  );
}
