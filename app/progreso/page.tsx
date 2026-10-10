'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, SectionTitle, Spinner, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';

interface DayXp { date: string; xp: number }
interface BodyEntry { id: string; date: string; weightKg?: number; notes?: string }

export default function ProgresoPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<{
    xpByDay: DayXp[];
    totalSessions: number;
    totalXp: number;
    attributes: { str: number; sta: number; wis: number };
    bodyProgress: BodyEntry[];
  } | null>(null);
  const [weight, setWeight] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);

  useEffect(() => {
    fetch(`/api/progress?days=${days}`)
      .then((r) => r.json())
      .then(setData);
  }, [days]);

  async function saveWeight() {
    const w = Number(weight);
    if (!w || w < 25 || w > 350) return;
    setSavingWeight(true);
    // Reutilizamos el endpoint de progreso corporal vía API dedicada si existiera;
    // por ahora se guarda como entrada de progreso con un POST simple:
    await fetch('/api/progress/weight', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ weightKg: w, date: new Date().toISOString().slice(0, 10) }),
    });
    setWeight('');
    setSavingWeight(false);
    fetch(`/api/progress?days=${days}`).then((r) => r.json()).then(setData);
  }

  if (!data) return <Spinner label="Consultando los anales de la forja…" />;

  const maxXp = Math.max(10, ...data.xpByDay.map((d) => d.xp));
  const activeDays = data.xpByDay.filter((d) => d.xp > 0).length;
  const weights = data.bodyProgress.filter((b) => b.weightKg).slice().reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-black">📈 Progreso</h1>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Rango de días">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              role="radio"
              aria-checked={days === d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${days === d ? 'border-neon-violet bg-violet-500/15' : 'border-line text-mist'}`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Card className="!p-3">
          <p className="font-display text-2xl font-black text-neon-cyan">{Math.round(data.totalXp)}</p>
          <p className="text-[11px] text-mist">XP total</p>
        </Card>
        <Card className="!p-3">
          <p className="font-display text-2xl font-black text-neon-violet">{data.totalSessions}</p>
          <p className="text-[11px] text-mist">Sesiones</p>
        </Card>
        <Card className="!p-3">
          <p className="font-display text-2xl font-black text-ember">{activeDays}</p>
          <p className="text-[11px] text-mist">Días activos</p>
        </Card>
      </div>

      <Card>
        <SectionTitle>XP por día</SectionTitle>
        {data.xpByDay.every((d) => d.xp === 0) ? (
          <EmptyState icon="📊" title="Sin datos aún" description="Tus barras de XP aparecerán aquí cuando entrenes." />
        ) : (
          <div className="flex items-end gap-[3px] h-36" role="img" aria-label={`Gráfico de XP de los últimos ${days} días`}>
            {data.xpByDay.map((d, i) => (
              <motion.div
                key={d.date}
                className="flex-1 rounded-t-md bg-gradient-to-t from-violet-600 to-cyan-400 min-h-[3px]"
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(2, (d.xp / maxXp) * 100)}%` }}
                transition={{ delay: i * 0.015, duration: 0.4 }}
                title={`${d.date}: ${Math.round(d.xp)} XP`}
              />
            ))}
          </div>
        )}
        <div className="flex justify-between text-[10px] text-mist mt-1.5">
          <span>{data.xpByDay[0]?.date}</span>
          <span>{data.xpByDay[data.xpByDay.length - 1]?.date}</span>
        </div>
      </Card>

      <Card>
        <SectionTitle>Atributos acumulados</SectionTitle>
        {(
          [
            { key: 'str', label: '💪 Fuerza (STR)', color: 'from-orange-500 to-red-500' },
            { key: 'sta', label: '🔥 Estamina (STA)', color: 'from-violet-500 to-fuchsia-500' },
            { key: 'wis', label: '🔮 Sabiduría (WIS)', color: 'from-cyan-400 to-blue-500' },
          ] as const
        ).map(({ key, label, color }) => {
          const xp = data.attributes[key];
          const total = Math.max(1, data.attributes.str + data.attributes.sta + data.attributes.wis);
          return (
            <div key={key} className="mb-3 last:mb-0">
              <div className="flex justify-between text-sm mb-1">
                <span>{label}</span>
                <span className="font-bold">{Math.round(xp)} XP</span>
              </div>
              <div className="h-2.5 rounded-full bg-black/50 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(xp / total) * 100}%` }}
                  transition={{ duration: 0.7 }}
                />
              </div>
            </div>
          );
        })}
      </Card>

      <Card>
        <SectionTitle>Peso corporal (opcional)</SectionTitle>
        <p className="text-xs text-mist mb-3">
          Solo si te apetece llevar el registro. No vinculamos tu éxito a ningún número.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            min={25}
            max={350}
            step="0.1"
            inputMode="decimal"
            className="field-input"
            placeholder="kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            aria-label="Peso en kilogramos"
          />
          <Button onClick={saveWeight} disabled={savingWeight || !weight} variant="secondary">
            Guardar
          </Button>
        </div>
        {weights.length > 1 ? (
          <div className="flex items-end gap-1.5 h-24" role="img" aria-label="Tendencia de peso">
            {weights.slice(-20).map((w) => {
              const vals = weights.map((x) => x.weightKg!);
              const min = Math.min(...vals);
              const span = Math.max(1, Math.max(...vals) - min);
              return (
                <div
                  key={w.id}
                  className="flex-1 rounded-t bg-emerald-500/60 min-h-[6px]"
                  style={{ height: `${20 + ((w.weightKg! - min) / span) * 80}%` }}
                  title={`${w.date}: ${w.weightKg} kg`}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-mist">Registra al menos dos pesadas para ver la tendencia.</p>
        )}
      </Card>
    </div>
  );
}
