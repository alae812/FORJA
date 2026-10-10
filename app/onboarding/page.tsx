'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/primitives';

const STYLES = [
  {
    id: 'guardian',
    icon: '🛡️',
    name: 'Guardián',
    desc: 'Fuerza y constancia. El muro que nunca cae.',
  },
  {
    id: 'cazador',
    icon: '🏹',
    name: 'Cazador',
    desc: 'Estamina y velocidad. Siempre en movimiento.',
  },
  {
    id: 'sabio',
    icon: '🔮',
    name: 'Sabio',
    desc: 'Técnica y recuperación. La mente forja el cuerpo.',
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [heroName, setHeroName] = useState('');
  const [style, setStyle] = useState<(typeof STYLES)[number]['id']>('guardian');
  const [goal, setGoal] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ heroName: heroName.trim(), combatStyle: style, dailyGoalXp: goal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo crear tu héroe');
      router.replace('/historia?trigger=onboarding_complete&fresh=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="flex gap-2 mb-6" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-gradient-to-r from-violet-500 to-cyan-400' : 'bg-line'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <Card glow="violet">
                <h2 className="font-display text-2xl font-black mb-1">¿Cómo te llamará la forja?</h2>
                <p className="text-sm text-mist mb-4">Tu nombre de héroe. Sin tu nombre real.</p>
                <input
                  className="field-input mb-4"
                  placeholder="Nombre de héroe"
                  value={heroName}
                  onChange={(e) => setHeroName(e.target.value)}
                  maxLength={24}
                  autoFocus
                />
                <Button
                  className="w-full"
                  size="lg"
                  disabled={heroName.trim().length < 2}
                  onClick={() => setStep(1)}
                >
                  Continuar →
                </Button>
              </Card>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <Card glow="violet">
                <h2 className="font-display text-2xl font-black mb-1">Elige tu estilo</h2>
                <p className="text-sm text-mist mb-4">Marca tu camino. Podrás cambiarlo luego.</p>
                <div className="space-y-2.5 mb-4">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      aria-pressed={style === s.id}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        style === s.id
                          ? 'border-neon-violet bg-violet-500/10 shadow-[0_0_18px_rgba(167,139,250,0.3)]'
                          : 'border-line bg-white/[0.02] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl" aria-hidden>{s.icon}</span>
                        <div>
                          <p className="font-display font-bold">{s.name}</p>
                          <p className="text-xs text-mist">{s.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">←</Button>
                  <Button onClick={() => setStep(2)} className="flex-[2]" size="lg">Continuar →</Button>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <Card glow="violet">
                <h2 className="font-display text-2xl font-black mb-1">Tu objetivo diario</h2>
                <p className="text-sm text-mist mb-4">
                  ¿Cuánta XP quieres forjar cada día? Empieza suave: siempre podrás subirlo.
                </p>
                <div className="text-center mb-4">
                  <span className="font-display text-6xl font-black text-glow-cyan">{goal}</span>
                  <span className="text-mist ml-1">XP/día</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={120}
                  step={5}
                  value={goal}
                  onChange={(e) => setGoal(Number(e.target.value))}
                  className="w-full mb-2 accent-violet-500"
                  aria-label="Objetivo diario de XP"
                />
                <div className="flex justify-between text-xs text-mist mb-4">
                  <span>10 · suave</span>
                  <span>60 · exigente</span>
                  <span>120 · leyenda</span>
                </div>
                {error && <p className="text-blood text-sm mb-3" role="alert">{error}</p>}
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(1)} className="flex-1" disabled={loading}>←</Button>
                  <Button onClick={finish} className="flex-[2]" size="lg" disabled={loading}>
                    {loading ? 'Forjando…' : '🔥 ¡A la forja!'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
