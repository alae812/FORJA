import { requirePageProfile } from '@/lib/auth/page';
import { todayLocal } from '@/lib/services/report';
import { SessionForm } from '@/components/training/SessionForm';

// Ruta autenticada: se renderiza en el servidor por petici00f3n (no prerender).
export const instant = false;

export default async function NewSessionPage() {
  await requirePageProfile();
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black">⚔️ Nueva sesión</h1>
      <p className="text-sm text-mist -mt-2">
        Elige ejercicios, registra series o minutos y la forja calculará tu XP.
      </p>
      <SessionForm defaultDate={todayLocal()} />
    </div>
  );
}
