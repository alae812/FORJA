'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle, Spinner } from '@/components/ui/primitives';
import { DAILY_CAPS, XP_RULES } from '@/lib/gamification/config';

interface Settings {
  dailyGoalXp: number;
  habits: { id: string; label: string; enabled: boolean }[];
  plannedRestDays: number[];
  effectsEnabled: boolean;
  reduceMotion: boolean;
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function AjustesPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newHabit, setNewHabit] = useState('');

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => setSettings(d.settings));
  }, []);

  async function save(next: Settings) {
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings);
      setSaved(true);
    }
    setSaving(false);
  }

  if (!settings) return <Spinner label="Cargando ajustes…" />;

  const toggleRestDay = (d: number) => {
    const has = settings.plannedRestDays.includes(d);
    save({
      ...settings,
      plannedRestDays: has
        ? settings.plannedRestDays.filter((x) => x !== d)
        : [...settings.plannedRestDays, d],
    });
  };

  const addHabit = () => {
    const label = newHabit.trim();
    if (!label || settings.habits.length >= 12) return;
    save({
      ...settings,
      habits: [...settings.habits, { id: `h_${Date.now()}`, label, enabled: true }],
    });
    setNewHabit('');
  };

  const toggleHabit = (id: string) =>
    save({
      ...settings,
      habits: settings.habits.map((h) => (h.id === id ? { ...h, enabled: !h.enabled } : h)),
    });

  const removeHabit = (id: string) =>
    save({ ...settings, habits: settings.habits.filter((h) => h.id !== id) });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black">⚙️ Ajustes</h1>

      <Card>
        <SectionTitle>🎯 Objetivo diario de XP</SectionTitle>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={5}
            max={200}
            step={5}
            value={settings.dailyGoalXp}
            onChange={(e) => save({ ...settings, dailyGoalXp: Number(e.target.value) })}
            className="flex-1 accent-violet-500"
            aria-label="Objetivo diario de XP"
          />
          <span className="font-display text-2xl font-black text-neon-cyan w-16 text-right">
            {settings.dailyGoalXp}
          </span>
        </div>
      </Card>

      <Card>
        <SectionTitle>💧 Hábitos saludables</SectionTitle>
        <p className="text-xs text-mist mb-3">
          Alimentan el componente H de tu informe diario. Elige los que encajen contigo.
        </p>
        <ul className="space-y-2 mb-3">
          {settings.habits.map((h) => (
            <li key={h.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <button
                onClick={() => toggleHabit(h.id)}
                aria-pressed={h.enabled}
                className={`w-9 h-5 rounded-full relative transition-colors ${h.enabled ? 'bg-violet-500' : 'bg-line'}`}
                aria-label={`Activar hábito ${h.label}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${h.enabled ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
              <span className={`flex-1 text-sm font-bold ${h.enabled ? '' : 'text-mist line-through'}`}>{h.label}</span>
              <button onClick={() => removeHabit(h.id)} className="text-mist hover:text-blood" aria-label={`Eliminar ${h.label}`}>🗑️</button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            className="field-input"
            placeholder="Nuevo hábito (p. ej. Leer 10 min)"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            maxLength={80}
          />
          <Button variant="secondary" onClick={addHabit} disabled={!newHabit.trim()}>
            Añadir
          </Button>
        </div>
      </Card>

      <Card>
        <SectionTitle>🌙 Días de descanso planificado</SectionTitle>
        <p className="text-xs text-mist mb-3">
          El descanso planificado cuenta como adherencia: no penaliza tu informe.
        </p>
        <div className="flex gap-2">
          {DAYS.map((label, d) => {
            const active = settings.plannedRestDays.includes(d);
            return (
              <button
                key={d}
                onClick={() => toggleRestDay(d)}
                aria-pressed={active}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${active ? 'border-neon-violet bg-violet-500/15 text-neon-violet' : 'border-line text-mist'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle>✨ Efectos y movimiento</SectionTitle>
        <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-2 cursor-pointer">
          <span className="text-sm font-bold">Efectos visuales</span>
          <input
            type="checkbox"
            checked={settings.effectsEnabled}
            onChange={(e) => save({ ...settings, effectsEnabled: e.target.checked })}
            className="w-5 h-5 accent-violet-500"
          />
        </label>
        <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer">
          <span className="text-sm font-bold">Reducir movimiento</span>
          <input
            type="checkbox"
            checked={settings.reduceMotion}
            onChange={(e) => save({ ...settings, reduceMotion: e.target.checked })}
            className="w-5 h-5 accent-violet-500"
          />
        </label>
        <p className="text-xs text-mist mt-2">
          También se respeta automáticamente el ajuste de tu sistema (prefers-reduced-motion).
        </p>
      </Card>

      <Card>
        <SectionTitle>📏 Reglas de XP (transparentes)</SectionTitle>
        <ul className="text-sm text-mist space-y-1.5">
          <li>· Serie válida de fuerza: <span className="text-bone font-bold">{XP_RULES.SET_XP} XP</span> (+{XP_RULES.SET_BONUS_XP} si cumples el objetivo)</li>
          <li>· Cardio: <span className="text-bone font-bold">{XP_RULES.CARDIO_XP_PER_MIN} XP/min</span> · Movilidad/técnica: <span className="text-bone font-bold">{XP_RULES.MOBILITY_XP_PER_MIN} XP/min</span></li>
          <li>· Sesión completada: <span className="text-bone font-bold">{XP_RULES.SESSION_COMPLETE_XP} XP</span> · Objetivo diario: <span className="text-bone font-bold">{XP_RULES.DAILY_GOAL_XP} XP</span></li>
          <li>· Topes diarios: {DAILY_CAPS.maxSets} series · {DAILY_CAPS.maxCardioMin} min cardio · {DAILY_CAPS.maxMobilityMin} min movilidad · {DAILY_CAPS.maxSessionsCompleted} sesiones</li>
          <li>· Nivel L requiere <span className="text-bone font-bold">100 × L²</span> XP acumulada</li>
        </ul>
      </Card>

      {saved && <p className="text-emerald-300 text-sm text-center" role="status">✓ Ajustes guardados</p>}
      {saving && <p className="text-mist text-sm text-center">Guardando…</p>}

      <Card>
        <SectionTitle>🔒 Privacidad y datos</SectionTitle>
        <p className="text-sm text-mist mb-3">
          Exporta o elimina todos tus datos cuando quieras. Sin letra pequeña.
        </p>
        <Link
          href="/privacidad"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neon-violet/40 text-neon-violet text-sm font-bold hover:bg-violet-500/10 transition-colors"
        >
          Gestionar mis datos →
        </Link>
      </Card>
    </div>
  );
}
