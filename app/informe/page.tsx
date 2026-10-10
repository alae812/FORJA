'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ReportCardView } from '@/components/reports/ReportCardView';
import { Card, SectionTitle, Spinner } from '@/components/ui/primitives';
import type { DailyReport } from '@/types';

interface Habit { id: string; label: string; done: boolean }

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function InformePage() {
  return (
    <Suspense fallback={<Spinner label="Forjando tu informe…" />}>
      <InformeInner />
    </Suspense>
  );
}

function InformeInner() {
  const [date] = useState(todayStr());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [energy, setEnergy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, h, w] = await Promise.all([
        fetch(`/api/report?date=${date}`).then((x) => x.json()),
        fetch(`/api/habits?date=${date}`).then((x) => x.json()),
        fetch(`/api/wellbeing?date=${date}`).then((x) => x.json()),
      ]);
      if (r.report) setReport(r.report);
      if (h.habits) setHabits(h.habits);
      if (w.log) setEnergy(w.log.energy);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function toggleHabit(habit: Habit) {
    const next = !habit.done;
    setHabits((l) => l.map((x) => (x.id === habit.id ? { ...x, done: next } : x)));
    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date, habitId: habit.id, done: next }),
    });
    // Recalcular el informe con los nuevos hábitos
    const r = await fetch(`/api/report?date=${date}`).then((x) => x.json());
    if (r.report) setReport(r.report);
  }

  async function saveEnergy(value: number) {
    setEnergy(value);
    setSaving(true);
    await fetch('/api/wellbeing', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date, energy: value }),
    });
    const r = await fetch(`/api/report?date=${date}`).then((x) => x.json());
    if (r.report) setReport(r.report);
    setSaving(false);
  }

  if (loading) return <Spinner label="Forjando tu informe…" />;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black">📊 Informe diario</h1>

      {report && (
        <ReportCardView
          report={report}
          dateLabel={new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        />
      )}

      <Card>
        <SectionTitle>💧 Hábitos de hoy</SectionTitle>
        {habits.length === 0 ? (
          <p className="text-sm text-mist">
            No tienes hábitos configurados. Actívalos en <span className="text-bone font-bold">Ajustes</span> para
            completar tu informe.
          </p>
        ) : (
          <ul className="space-y-2">
            {habits.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => toggleHabit(h)}
                  aria-pressed={h.done}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    h.done
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-line bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm ${
                      h.done ? 'border-emerald-400 bg-emerald-400 text-[#06060c]' : 'border-mist'
                    }`}
                    aria-hidden
                  >
                    {h.done ? '✓' : ''}
                  </span>
                  <span className={`text-sm font-bold ${h.done ? 'line-through text-mist' : ''}`}>
                    {h.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle>⚡ Mi energía hoy</SectionTitle>
        <p className="text-xs text-mist mb-3">
          ¿Cómo está tu energía? Alimenta la recuperación de tu informe (sin juicios).
        </p>
        <div className="flex gap-2" role="radiogroup" aria-label="Energía del 1 al 5">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              role="radio"
              aria-checked={energy === v}
              onClick={() => saveEnergy(v)}
              disabled={saving}
              className={`flex-1 py-3 rounded-xl border font-display font-black text-lg transition-all ${
                energy === v
                  ? 'border-neon-cyan bg-cyan-500/15 text-neon-cyan shadow-[0_0_14px_rgba(34,211,238,0.3)]'
                  : 'border-line text-mist hover:border-white/20'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-mist mt-1.5">
          <span>😴 Agotado</span>
          <span>A tope 🔥</span>
        </div>
      </Card>
    </div>
  );
}
