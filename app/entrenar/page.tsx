import Link from 'next/link';
import { getDb } from '@/lib/db';
import { requirePageProfile } from '@/lib/auth/page';
import { Card, SectionTitle, Badge, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';

// Ruta autenticada: se renderiza en el servidor por petici00f3n (no prerender).
export const instant = false;

export default async function TrainingListPage() {
  const profile = await requirePageProfile();
  const sessions = await getDb().listSessions(profile.id, { limit: 30 });
  const active = sessions.filter((s) => s.status !== 'cancelled');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-black">⚔️ Entrenamientos</h1>
        <Link href="/entrenar/nueva">
          <Button size="sm">➕ Nueva sesión</Button>
        </Link>
      </div>

      {active.length === 0 ? (
        <EmptyState
          icon="🔥"
          title="La forja está fría"
          description="Aún no has registrado sesiones. Cada golpe cuenta."
          action={
            <Link href="/entrenar/nueva">
              <Button>Registrar mi primera sesión</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <SectionTitle>Historial</SectionTitle>
          <ul className="space-y-2">
            {active.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/entrenar/${s.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-neon-violet/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm">
                      {s.date}
                      {s.status === 'planned' && (
                        <span className="text-mist font-normal"> · planificada</span>
                      )}
                    </p>
                    <p className="text-xs text-mist truncate">
                      {s.exercises.map((e) => e.name).join(' · ')}
                    </p>
                  </div>
                  <Badge color={s.status === 'completed' ? 'cyan' : 'gray'}>
                    {s.status === 'completed' ? `+${Math.round(s.xpAwarded)} XP` : 'planificada'}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="font-display font-bold mb-2">📏 Límites diarios de XP</h3>
        <ul className="text-sm text-mist space-y-1">
          <li>· Hasta 30 series de fuerza y 30 bonus de objetivo al día</li>
          <li>· Hasta 120 min de cardio y 60 min de movilidad/técnica al día</li>
          <li>· Hasta 3 sesiones con bonus de completada al día</li>
        </ul>
        <p className="text-xs text-mist mt-2">
          Los límites evitan el spam y mantienen el juego justo. Lo que exceda el tope no puntúa.
        </p>
      </Card>
    </div>
  );
}
