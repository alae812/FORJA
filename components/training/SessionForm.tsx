'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card, Badge } from '@/components/ui/primitives';
import { LevelUpOverlay } from '@/components/character/LevelUpOverlay';
import { EXERCISE_CATEGORIES, type ExerciseCategory, type TrainingSession } from '@/types';

interface DraftExercise {
  key: string;
  name: string;
  category: ExerciseCategory;
  sets: string;
  reps: string;
  loadKg: string;
  durationMin: string;
  targetMet: boolean;
}

const CATEGORIES = Object.entries(EXERCISE_CATEGORIES) as [
  ExerciseCategory,
  { name: string },
][];

const newDraft = (): DraftExercise => ({
  key: Math.random().toString(36).slice(2),
  name: '',
  category: 'strength',
  sets: '',
  reps: '',
  loadKg: '',
  durationMin: '',
  targetMet: false,
});

const QUICK_EXERCISES: { category: ExerciseCategory; name: string }[] = [
  { category: 'strength', name: 'Press banca' },
  { category: 'strength', name: 'Sentadilla' },
  { category: 'strength', name: 'Peso muerto' },
  { category: 'bodyweight', name: 'Flexiones' },
  { category: 'bodyweight', name: 'Dominadas' },
  { category: 'bodyweight', name: 'Sentadilla búlgara' },
  { category: 'cardio', name: 'Carrera suave' },
  { category: 'cardio', name: 'Bicicleta' },
  { category: 'cardio', name: 'Caminata rápida' },
  { category: 'mobility', name: 'Movilidad de cadera' },
  { category: 'mobility', name: 'Estiramiento general' },
  { category: 'technique', name: 'Práctica de técnica' },
];

interface CreateResult {
  session: TrainingSession;
  deduped: boolean;
  levelUps: number[];
  capped: boolean;
  storyTriggers: string[];
  dailyGoalAwarded: boolean;
}

export function SessionForm({ defaultDate }: { defaultDate: string }) {
  const [date, setDate] = useState(defaultDate);
  const [exercises, setExercises] = useState<DraftExercise[]>([newDraft()]);
  const [step, setStep] = useState<'edit' | 'review' | 'done'>('edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  // Clave de idempotencia: se genera una vez por formulario (los reintentos no duplican XP)
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const update = (key: string, patch: Partial<DraftExercise>) =>
    setExercises((list) => list.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  const remove = (key: string) =>
    setExercises((list) => (list.length > 1 ? list.filter((e) => e.key !== key) : list));

  const valid = useMemo(() => {
    return exercises.every((e) => {
      if (!e.name.trim()) return false;
      const isSets = e.category === 'strength' || e.category === 'bodyweight';
      if (isSets) return Number(e.sets) > 0;
      return Number(e.durationMin) > 0;
    });
  }, [exercises]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          date,
          status: 'completed',
          exercises: exercises.map((e) => ({
            name: e.name.trim(),
            category: e.category,
            sets: e.sets ? Number(e.sets) : undefined,
            reps: e.reps ? Number(e.reps) : undefined,
            loadKg: e.loadKg ? Number(e.loadKg) : undefined,
            durationMin: e.durationMin ? Number(e.durationMin) : undefined,
            targetMet: e.targetMet || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar la sesión');
      setResult(data);
      setStep('done');
      if (data.levelUps?.length > 0) setShowLevelUp(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  if (step === 'done' && result) {
    return <SessionResult result={result} showLevelUp={showLevelUp} setShowLevelUp={setShowLevelUp} />;
  }

  return (
    <div className="space-y-4">
      {step === 'edit' && (
        <>
          <Card>
            <label className="block text-sm text-mist mb-1.5" htmlFor="session-date">
              Fecha de la sesión
            </label>
            <input
              id="session-date"
              type="date"
              className="field-input"
              value={date}
              max={defaultDate}
              onChange={(e) => setDate(e.target.value)}
            />
          </Card>

          <AnimatePresence initial={false}>
            {exercises.map((e, i) => (
              <motion.div
                key={e.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              >
                <ExerciseRow
                  index={i}
                  draft={e}
                  onUpdate={(p) => update(e.key, p)}
                  onRemove={() => remove(e.key)}
                  onQuickAdd={(name, category) => update(e.key, { name, category })}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          <Button
            variant="secondary"
            onClick={() => setExercises((l) => [...l, newDraft()])}
            className="w-full"
          >
            ➕ Añadir ejercicio
          </Button>

          <Button disabled={!valid} onClick={() => setStep('review')} className="w-full" size="lg">
            Revisar sesión →
          </Button>
          {!valid && (
            <p className="text-xs text-mist text-center">
              Completa el nombre y las series o minutos de cada ejercicio.
            </p>
          )}
        </>
      )}

      {step === 'review' && (
        <Card>
          <h3 className="font-display text-lg font-bold mb-3">Revisa tu sesión</h3>
          <p className="text-sm text-mist mb-3">
            {date} · {exercises.length} {exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
          </p>
          <ul className="space-y-2 mb-4">
            {exercises.map((e) => (
              <li key={e.key} className="flex items-center justify-between text-sm gap-2">
                <span className="font-bold">{e.name}</span>
                <Badge color="gray">
                  {e.category === 'strength' || e.category === 'bodyweight'
                    ? `${e.sets} series${e.reps ? ` × ${e.reps} reps` : ''}${e.loadKg ? ` · ${e.loadKg} kg` : ''}`
                    : `${e.durationMin} min`}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="text-xs text-mist mb-4">
            La XP se calcula en el servidor al guardar, respetando los límites diarios.
          </p>
          {error && <p className="text-blood text-sm mb-3" role="alert">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('edit')} className="flex-1" disabled={saving}>
              ← Editar
            </Button>
            <Button onClick={submit} className="flex-1" disabled={saving}>
              {saving ? 'Forjando…' : '⚔️ Guardar sesión'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ExerciseRow({
  index,
  draft,
  onUpdate,
  onRemove,
  onQuickAdd,
}: {
  index: number;
  draft: DraftExercise;
  onUpdate: (p: Partial<DraftExercise>) => void;
  onRemove: () => void;
  onQuickAdd: (name: string, category: ExerciseCategory) => void;
}) {
  const isSets = draft.category === 'strength' || draft.category === 'bodyweight';
  return (
    <Card className="mb-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display font-bold text-neon-cyan">Ejercicio {index + 1}</h4>
        <button
          onClick={onRemove}
          className="text-mist hover:text-blood text-sm"
          aria-label={`Eliminar ejercicio ${index + 1}`}
        >
          🗑️ Quitar
        </button>
      </div>

      <label className="block text-xs text-mist mb-1">Categoría</label>
      <select
        className="field-input mb-3"
        value={draft.category}
        onChange={(e) => onUpdate({ category: e.target.value as ExerciseCategory })}
      >
        {CATEGORIES.map(([key, meta]) => (
          <option key={key} value={key}>
            {meta.name}
          </option>
        ))}
      </select>

      <label className="block text-xs text-mist mb-1">Nombre</label>
      <input
        className="field-input mb-2"
        placeholder="p. ej. Press banca"
        value={draft.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        maxLength={80}
      />
      <div className="flex flex-wrap gap-1.5 mb-3">
        {QUICK_EXERCISES.filter((q) => q.category === draft.category).map((q) => (
          <button
            key={q.name}
            type="button"
            onClick={() => onQuickAdd(q.name, q.category)}
            className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-mist hover:text-bone hover:border-neon-violet/50"
          >
            {q.name}
          </button>
        ))}
      </div>

      {isSets ? (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="block text-xs text-mist mb-1">Series *</label>
            <input
              type="number"
              min={1}
              max={200}
              inputMode="numeric"
              className="field-input"
              value={draft.sets}
              onChange={(e) => onUpdate({ sets: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-mist mb-1">Reps</label>
            <input
              type="number"
              min={0}
              max={1000}
              inputMode="numeric"
              className="field-input"
              value={draft.reps}
              onChange={(e) => onUpdate({ reps: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-mist mb-1">Kg</label>
            <input
              type="number"
              min={0}
              max={600}
              step="0.5"
              inputMode="decimal"
              className="field-input"
              value={draft.loadKg}
              onChange={(e) => onUpdate({ loadKg: e.target.value })}
            />
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <label className="block text-xs text-mist mb-1">Duración (minutos) *</label>
          <input
            type="number"
            min={1}
            max={600}
            step="0.5"
            inputMode="decimal"
            className="field-input"
            value={draft.durationMin}
            onChange={(e) => onUpdate({ durationMin: e.target.value })}
          />
        </div>
      )}

      {isSets && (
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={draft.targetMet}
            onChange={(e) => onUpdate({ targetMet: e.target.checked })}
            className="w-4 h-4 accent-violet-500"
          />
          <span>
            Cumplí el objetivo de las series <span className="text-ember font-bold">(+2 XP/serie)</span>
          </span>
        </label>
      )}
    </Card>
  );
}

function SessionResult({
  result,
  showLevelUp,
  setShowLevelUp,
}: {
  result: CreateResult;
  showLevelUp: boolean;
  setShowLevelUp: (v: boolean) => void;
}) {
  const router = useRouter();
  const { session } = result;
  return (
    <div className="space-y-4">
      <LevelUpOverlay
        key={`lvl-${result.levelUps.join('-')}`}
        open={showLevelUp}
        fromLevel={Math.max(0, result.levelUps[0] - 1)}
        toLevel={result.levelUps[result.levelUps.length - 1]}
        rewards={[]}
        onClose={() => setShowLevelUp(false)}
      />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <Card glow="cyan" className="text-center">
          <p className="font-display text-sm tracking-[0.25em] text-neon-cyan mb-1">
            SESIÓN FORJADA
          </p>
          <p className="font-display text-5xl font-black text-glow-cyan mb-1">
            +{Math.round(session.xpAwarded)} XP
          </p>
          {result.deduped && (
            <Badge color="gray">Ya estaba registrada (sin duplicar XP)</Badge>
          )}
          {result.capped && (
            <p className="text-xs text-ember mt-2">
              ⚠️ Un límite diario recortó parte de la recompensa.
            </p>
          )}
          {result.dailyGoalAwarded && (
            <p className="text-sm text-ember font-bold mt-2">🎯 ¡Objetivo diario cumplido! +5 XP</p>
          )}
        </Card>
      </motion.div>

      <Card>
        <h3 className="font-display font-bold mb-2">Desglose de XP</h3>
        <ul className="space-y-1.5">
          {session.xpBreakdown.map((item, i) => (
            <li key={i} className="flex justify-between text-sm gap-2">
              <span className="text-mist">{item.detail}</span>
              <span className="font-bold text-bone whitespace-nowrap">+{item.xp} XP</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => router.push('/entrenar')}>
          Ver sesiones
        </Button>
        <Button
          onClick={() => {
            const trigger = result.storyTriggers[0] ?? 'manual';
            router.push(`/historia?trigger=${trigger}`);
          }}
        >
          📖 Continuar historia
        </Button>
      </div>
    </div>
  );
}
