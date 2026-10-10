'use client';
import { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle, Spinner } from '@/components/ui/primitives';

interface SleepLog {
  date: string;
  bedTime: string;
  wakeTime: string;
  durationMin: number;
  quality: number;
  notes?: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}min`;
}
const QUALITY_LABEL = ['', '😫 Muy mala', '😕 Mala', '😐 Regular', '🙂 Buena', '🤩 Excelente'];

export default function SuenoPage() {
  return (
    <Suspense fallback={<Spinner label="Cargando…" />}>
      <SuenoInner />
    </Suspense>
  );
}

function SuenoInner() {
  const [date, setDate] = useState(todayStr());
  const [bedTime, setBedTime] = useState('23:30');
  const [wakeTime, setWakeTime] = useState('07:30');
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');
  const [week, setWeek] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load(d: string) {
    const to = d;
    const fromD = new Date(`${d}T12:00:00`);
    fromD.setDate(fromD.getDate() - 6);
    const from = fromD.toISOString().slice(0, 10);
    const [one, range] = await Promise.all([
      fetch(`/api/sleep?date=${d}`).then((r) => r.json()),
      fetch(`/api/sleep?from=${from}&to=${to}`).then((r) => r.json()),
    ]);
    if (one.log) {
      setBedTime(one.log.bedTime.slice(0, 5));
      setWakeTime(one.log.wakeTime.slice(0, 5));
      setQuality(one.log.quality);
      setNotes(one.log.notes ?? '');
    }
    setWeek(range.logs ?? []);
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
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/sleep', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date, bedTime, wakeTime, quality, notes: notes || undefined }),
    });
    if (res.ok) {
      setSaved(true);
      load(date);
    }
    setSaving(false);
  }

  const maxDur = Math.max(480, ...week.map((w) => w.durationMin));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black">😴 Sueño</h1>
      <p className="text-sm text-mist -mt-2">
        El descanso también entrena. Registra tus horas sin obsesionarte: la constancia importa más que la perfección.
      </p>

      <Card glow="cyan">
        <SectionTitle>Registrar descanso</SectionTitle>
        <label className="block text-xs text-mist mb-1">Fecha</label>
        <input type="date" className="field-input mb-3" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-mist mb-1" htmlFor="bed">Me acosté</label>
            <input id="bed" type="time" className="field-input" value={bedTime} onChange={(e) => setBedTime(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-mist mb-1" htmlFor="wake">Me desperté</label>
            <input id="wake" type="time" className="field-input" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
          </div>
        </div>
        <label className="block text-xs text-mist mb-2">Calidad percibida: <span className="text-bone font-bold">{QUALITY_LABEL[quality]}</span></label>
        <div className="flex gap-2 mb-3" role="radiogroup" aria-label="Calidad del sueño">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              role="radio"
              aria-checked={quality === v}
              onClick={() => setQuality(v)}
              className={`flex-1 py-2.5 rounded-xl border text-xl transition-all ${quality === v ? 'border-neon-violet bg-violet-500/15 shadow-[0_0_14px_rgba(167,139,250,0.3)]' : 'border-line opacity-60 hover:opacity-100'}`}
            >
              {['😫', '😕', '😐', '🙂', '🤩'][v - 1]}
            </button>
          ))}
        </div>
        <label className="block text-xs text-mist mb-1" htmlFor="snotes">Notas (opcional)</label>
        <textarea id="snotes" className="field-input mb-4" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="¿Algo que afectó tu descanso?" />
        <Button onClick={save} disabled={saving || loading} className="w-full" size="lg">
          {saving ? 'Guardando…' : '💾 Guardar descanso'}
        </Button>
        {saved && <p className="text-emerald-300 text-sm mt-2 text-center" role="status">Descanso registrado. La forja descansa contigo. 🌙</p>}
      </Card>

      <Card>
        <SectionTitle>Últimos 7 días</SectionTitle>
        {loading ? <Spinner /> : week.length === 0 ? (
          <p className="text-sm text-mist">Sin registros esta semana.</p>
        ) : (
          <div className="space-y-2.5">
            {week.map((w, i) => (
              <div key={w.date}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-mist">{new Date(`${w.date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</span>
                  <span className="font-bold">{fmtDuration(w.durationMin)} · {['', '😫', '😕', '😐', '🙂', '🤩'][w.quality]}</span>
                </div>
                <div className="h-2.5 rounded-full bg-black/50 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${(w.durationMin / maxDur) * 100}%` }}
                    transition={{ delay: i * 0.06, duration: 0.5 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
