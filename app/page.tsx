import Link from 'next/link';
import { getDb } from '@/lib/db';
import { requirePageProfile } from '@/lib/auth/page';
import { levelProgress } from '@/lib/gamification/levels';
import { todayLocal } from '@/lib/services/report';
import { CharacterHud } from '@/components/character/CharacterHud';
import { XpBar } from '@/components/ui/XpBar';
import { Card, SectionTitle, Badge, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { getStoryOverview } from '@/lib/services/story';

// Ruta autenticada: se renderiza en el servidor por petici00f3n (no prerender).
export const instant = false;

export default async function Dashboard() {
  const profile = await requirePageProfile();
  const db = getDb();
  const today = todayLocal();

  const [stats, settings, sessions, story] = await Promise.all([
    db.getStats(profile.id),
    db.getSettings(profile.id),
    db.listSessions(profile.id, { limit: 4 }),
    getStoryOverview(profile.id),
  ]);

  const progress = levelProgress(stats.totalXp);
  const xpToday = await db.getTrainingXpForDay(profile.id, today);
  const goalPct = Math.min(100, (100 * xpToday) / Math.max(1, settings.dailyGoalXp));
  const recent = sessions.filter((s) => s.status !== 'cancelled').slice(0, 3);

  return (
    <div className="space-y-4">
      <CharacterHud
        heroName={profile.heroName}
        level={progress.level}
        progress={progress.progress}
        xpIntoLevel={progress.xpIntoLevel}
        xpForNextLevel={progress.xpForNextLevel}
        combatStyle={profile.combatStyle}
      />

      {/* Objetivo diario + sesión rápida */}
      <Card glow="cyan">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-bold">🎯 Objetivo diario</h3>
          <Badge color={goalPct >= 100 ? 'green' : 'cyan'}>
            {Math.round(xpToday)} / {settings.dailyGoalXp} XP
          </Badge>
        </div>
        <XpBar progress={goalPct / 100} gradient="from-cyan-400 to-emerald-400" label="Objetivo diario" />
        <Link href="/entrenar/nueva" className="block mt-4">
          <Button size="lg" className="w-full">
            ⚔️ Sesión rápida
          </Button>
        </Link>
      </Card>

      {/* Próximo acontecimiento narrativo */}
      <Card>
        <SectionTitle
          action={
            <Link href="/historia" className="text-sm text-neon-cyan font-bold">
              Ver historia →
            </Link>
          }
        >
          📖 La historia continúa
        </SectionTitle>
        {story.currentScene ? (
          <div>
            <p className="font-display font-bold">{story.currentScene.title}</p>
            <p className="text-sm text-mist line-clamp-2 mt-1">{story.currentScene.narration}</p>
          </div>
        ) : (
          <p className="text-sm text-mist">
            La forja aguarda tu próxima hazaña. Cada sesión desbloquea un nuevo capítulo.
          </p>
        )}
      </Card>

      {/* Progreso reciente */}
      <Card>
        <SectionTitle
          action={
            <Link href="/entrenar" className="text-sm text-neon-cyan font-bold">
              Ver todas →
            </Link>
          }
        >
          🕘 Actividad reciente
        </SectionTitle>
        {recent.length === 0 ? (
          <EmptyState
            icon="⚔️"
            title="Aún no hay sesiones"
            description="Registra tu primera sesión y enciende la forja."
            action={
              <Link href="/entrenar/nueva">
                <Button size="sm">Crear mi primera sesión</Button>
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2">
            {recent.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/entrenar/${s.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-neon-violet/40 transition-colors"
                >
                  <div>
                    <p className="font-bold text-sm">
                      {s.exercises.length} {s.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                      <span className="text-mist font-normal"> · {s.date}</span>
                    </p>
                    <p className="text-xs text-mist truncate max-w-[200px]">
                      {s.exercises.map((e) => e.name).join(', ')}
                    </p>
                  </div>
                  <Badge color={s.status === 'completed' ? 'cyan' : 'gray'}>
                    +{Math.round(s.xpAwarded)} XP
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Accesos rápidos */}
      <div>
        <SectionTitle>Explorar</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: '/progreso', icon: '📈', label: 'Progreso' },
            { href: '/sueno', icon: '😴', label: 'Sueño' },
            { href: '/nutricion', icon: '🍽️', label: 'Nutrición' },
            { href: '/cuerpo', icon: '🪞', label: 'Cuerpo' },
            { href: '/recompensas', icon: '🎁', label: 'Recompensas' },
            { href: '/privacidad', icon: '🔒', label: 'Privacidad' },
          ].map((l) => (
            <Link key={l.href} href={l.href}>
              <Card className="text-center !p-3 hover:border-neon-violet/50 transition-colors h-full">
                <div className="text-2xl mb-1" aria-hidden>{l.icon}</div>
                <p className="text-xs font-bold">{l.label}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
