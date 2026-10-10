'use client';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, Badge, Spinner, SectionTitle } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/Sheet';
import type { TrainingSession } from '@/types';

export default function SessionDetailPage() {
  return (
    <Suspense fallback={<Spinner label="Cargando sesión…" />}>
      <SessionDetailInner />
    </Suspense>
  );
}

function SessionDetailInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/training/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? 'No se encontró la sesión');
        setSession(data.session);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [id]);

  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/training/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo eliminar');
      router.replace('/entrenar');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) return <Spinner label="Cargando sesión…" />;
  if (error || !session) {
    return (
      <Card>
        <p className="text-blood mb-4" role="alert">{error ?? 'Sesión no encontrada'}</p>
        <Link href="/entrenar"><Button variant="secondary">← Volver</Button></Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-black">Sesión del {session.date}</h1>
        <Badge color={session.status === 'completed' ? 'cyan' : 'gray'}>
          {session.status === 'completed' ? `+${Math.round(session.xpAwarded)} XP` : session.status}
        </Badge>
      </div>

      <Card>
        <SectionTitle>Ejercicios</SectionTitle>
        <ul className="space-y-2">
          {session.exercises.map((e) => (
            <li key={e.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex justify-between items-center gap-2">
                <p className="font-bold text-sm">{e.name}</p>
                <Badge color="gray">{e.category}</Badge>
              </div>
              <p className="text-xs text-mist mt-1">
                {(e.category === 'strength' || e.category === 'bodyweight')
                  ? `${e.sets ?? 0} series${e.reps ? ` × ${e.reps} reps` : ''}${e.loadKg ? ` · ${e.loadKg} kg` : ''}${e.targetMet ? ' · 🎯 objetivo' : ''}`
                  : `${e.durationMin ?? 0} min`}
                {e.notes ? ` · ${e.notes}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionTitle>Desglose de XP</SectionTitle>
        <ul className="space-y-1.5">
          {session.xpBreakdown.map((item, i) => (
            <li key={i} className="flex justify-between text-sm gap-2">
              <span className="text-mist">{item.detail}</span>
              <span className="font-bold whitespace-nowrap">+{item.xp} XP</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-mist mt-3">
          Calculado en el servidor al registrar la sesión. Editar o eliminar ajusta tu XP de forma auditable.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/entrenar"><Button variant="secondary" className="w-full">← Sesiones</Button></Link>
        <Button variant="danger" onClick={() => setConfirmDelete(true)} className="w-full">
          🗑️ Eliminar
        </Button>
      </div>
      <p className="text-xs text-mist text-center">
        Al eliminar, la XP otorgada se revierte con un registro auditable.
      </p>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Eliminar sesión"
        description={`Se revertirán ${Math.round(session.xpAwarded)} XP de tu total. Esta acción queda registrada en tu historial.`}
        confirmLabel={deleting ? 'Eliminando…' : 'Sí, eliminar'}
        danger
      />
    </div>
  );
}
