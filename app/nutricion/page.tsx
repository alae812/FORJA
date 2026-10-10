'use client';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle, Badge, Spinner } from '@/components/ui/primitives';

const MEALS = [
  { id: 'desayuno', label: '🥐 Desayuno' },
  { id: 'comida', label: '🍽️ Comida' },
  { id: 'merienda', label: '🥪 Merienda' },
  { id: 'cena', label: '🌙 Cena' },
  { id: 'snack', label: '🍎 Snack' },
] as const;

interface Log { id: string; meal: string; description: string; waterMl?: number; createdAt: string }

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function NutricionPage() {
  return (
    <Suspense fallback={<Spinner label="Cargando…" />}>
      <NutricionInner />
    </Suspense>
  );
}

function NutricionInner() {
  const [date, setDate] = useState(todayStr());
  const [meal, setMeal] = useState<string>('comida');
  const [description, setDescription] = useState('');
  const [waterMl, setWaterMl] = useState('');
  const [logs, setLogs] = useState<Log[]>([]);
  const [totalWater, setTotalWater] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load(d: string) {
    const data = await fetch(`/api/nutrition?date=${d}`).then((r) => r.json());
    setLogs(data.logs ?? []);
    setTotalWater(data.waterMl ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const d = date;
      if (cancelled) return;
      await load(d);
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  async function save() {
    if (!description.trim()) return;
    setSaving(true);
    const res = await fetch('/api/nutrition', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        date,
        meal,
        description: description.trim(),
        waterMl: waterMl ? Number(waterMl) : undefined,
      }),
    });
    if (res.ok) {
      setDescription('');
      setWaterMl('');
      load(date);
    }
    setSaving(false);
  }

  async function remove(id: string) {
    await fetch(`/api/nutrition/${id}`, { method: 'DELETE' });
    load(date);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black">🍽️ Nutrición</h1>
      <p className="text-sm text-mist -mt-2">
        Registra tus comidas como <span className="text-bone font-bold">estimaciones</span>: aquí no
        contamos calorías exactas ni juzgamos lo que comes.
      </p>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>💧 Agua de hoy</SectionTitle>
          <Badge color="cyan">{(totalWater / 1000).toFixed(1)} L</Badge>
        </div>
        <div className="h-2.5 rounded-full bg-black/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
            style={{ width: `${Math.min(100, (totalWater / 2000) * 100)}%` }}
          />
        </div>
        <p className="text-[11px] text-mist mt-1.5">Referencia orientativa: ~2 L/día. Escucha a tu cuerpo.</p>
      </Card>

      <Card glow="violet">
        <SectionTitle>Registrar comida</SectionTitle>
        <label className="block text-xs text-mist mb-1">Fecha</label>
        <input type="date" className="field-input mb-3" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
        <label className="block text-xs text-mist mb-1.5">Comida</label>
        <div className="flex flex-wrap gap-2 mb-3" role="radiogroup" aria-label="Tipo de comida">
          {MEALS.map((m) => (
            <button
              key={m.id}
              role="radio"
              aria-checked={meal === m.id}
              onClick={() => setMeal(m.id)}
              className={`px-3 py-2 rounded-xl border text-sm font-bold transition-all ${meal === m.id ? 'border-neon-violet bg-violet-500/15' : 'border-line text-mist hover:border-white/20'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <label className="block text-xs text-mist mb-1" htmlFor="food">¿Qué comiste? (aproximado)</label>
        <textarea
          id="food"
          className="field-input mb-3"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          placeholder="p. ej. Arroz con pollo y ensalada, un vaso de agua"
        />
        <label className="block text-xs text-mist mb-1" htmlFor="water">Agua con esta comida (ml, opcional)</label>
        <input
          id="water"
          type="number"
          min={0}
          max={2000}
          inputMode="numeric"
          className="field-input mb-4"
          value={waterMl}
          onChange={(e) => setWaterMl(e.target.value)}
          placeholder="250"
        />
        <Button onClick={save} disabled={saving || !description.trim()} className="w-full" size="lg">
          {saving ? 'Guardando…' : '💾 Registrar'}
        </Button>
      </Card>

      <Card>
        <SectionTitle>Hoy</SectionTitle>
        {loading ? <Spinner /> : logs.length === 0 ? (
          <p className="text-sm text-mist">Nada registrado hoy.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {MEALS.find((m) => m.id === l.meal)?.label ?? l.meal}
                    {l.waterMl ? <span className="text-neon-cyan font-normal"> · 💧 {l.waterMl} ml</span> : null}
                  </p>
                  <p className="text-xs text-mist">{l.description}</p>
                </div>
                <button onClick={() => remove(l.id)} className="text-mist hover:text-blood text-sm shrink-0" aria-label="Borrar registro">
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
