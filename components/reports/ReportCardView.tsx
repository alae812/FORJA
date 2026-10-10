'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Card, Badge, SectionTitle } from '@/components/ui/primitives';
import type { DailyReport } from '@/types';

const RANK_STYLE: Record<string, { label: string; color: string; glow: string }> = {
  S: { label: 'Legendario', color: 'text-amber-300', glow: 'drop-shadow-[0_0_12px_rgba(252,211,77,0.8)]' },
  A: { label: 'Épico', color: 'text-neon-violet', glow: 'drop-shadow-[0_0_12px_rgba(167,139,250,0.8)]' },
  B: { label: 'Sólido', color: 'text-neon-cyan', glow: 'drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]' },
  C: { label: 'En camino', color: 'text-emerald-300', glow: '' },
  D: { label: 'Día suave', color: 'text-mist', glow: '' },
};

/** Anillo de puntuación SVG animado (estático con reduced motion) */
export function ScoreRing({ score, rank }: { score: number; rank: string }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <ScoreRingStatic score={score} rank={rank} display={score} />;
  }
  return <ScoreRingAnimated score={score} rank={rank} />;
}

function ScoreRingStatic({ score, rank, display }: { score: number; rank: string; display: number }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const style = RANK_STYLE[rank] ?? RANK_STYLE.D;
  return (
    <div className="relative w-36 h-36 mx-auto" role="img" aria-label={`Puntuación ${score.toFixed(1)}, rango ${rank}`}>
      <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
        <circle cx="64" cy="64" r={R} fill="none" stroke="#262640" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - display / 100)}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-5xl font-black ${style.color} ${style.glow}`}>
          {rank}
        </span>
        <span className="text-sm font-bold text-bone">{display.toFixed(1)}</span>
      </div>
    </div>
  );
}

function ScoreRingAnimated({ score, rank }: { score: number; rank: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 1100);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(score * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return <ScoreRingStatic score={score} rank={rank} display={display} />;
}

const COMPONENT_META = [
  { key: 'training', label: '🏋️ Entrenamiento', weight: '45%' },
  { key: 'habits', label: '💧 Hábitos', weight: '25%' },
  { key: 'consistency', label: '📅 Constancia', weight: '20%' },
  { key: 'wellbeing', label: '😴 Recuperación', weight: '10%' },
] as const;

export function ReportCardView({ report, dateLabel }: { report: DailyReport; dateLabel: string }) {
  const incomplete = report.score == null || report.rank == null;

  return (
    <div className="space-y-4">
      <Card glow={incomplete ? undefined : 'violet'} className="text-center">
        <p className="text-xs text-mist uppercase tracking-widest mb-1">Report Card · {dateLabel}</p>
        {incomplete ? (
          <div className="py-4">
            <div className="text-4xl mb-2" aria-hidden>📝</div>
            <h3 className="font-display text-xl font-black mb-2">Evaluación incompleta</h3>
            <p className="text-sm text-mist mb-3">
              Faltan datos para calcular tu rango. No inventamos ceros: registra lo pendiente.
            </p>
            <ul className="text-left text-sm space-y-1.5 max-w-xs mx-auto">
              {report.missing.map((m) => (
                <li key={m} className="flex gap-2 text-mist">
                  <span className="text-ember" aria-hidden>▸</span> {m}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <ScoreRing score={report.score!} rank={report.rank!} />
            <p className="font-display font-bold text-lg mt-2">
              Rango {(RANK_STYLE[report.rank!] ?? RANK_STYLE.D).label}
            </p>
            {report.isRestDay && (
              <div className="mt-2"><Badge color="green">🌙 Descanso planificado cumplido</Badge></div>
            )}
          </>
        )}
      </Card>

      <Card>
        <SectionTitle>Componentes</SectionTitle>
        <ul className="space-y-3">
          {COMPONENT_META.map(({ key, label, weight }) => {
            const value = report.components[key];
            return (
              <li key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{label} <span className="text-mist text-xs">({weight})</span></span>
                  <span className="font-bold">
                    {value == null ? <span className="text-mist">sin datos</span> : `${value.toFixed(0)}/100`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-black/50 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${value ?? 0}%` }}
                    transition={{ duration: 0.7 }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>🧙</span>
          <div>
            <p className="font-display font-bold mb-1">Consejo de Temo</p>
            <p className="text-sm text-mist leading-relaxed">{report.recommendation}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Card className="!p-3">
          <p className="font-display text-xl font-black text-neon-cyan">{Math.round(report.xpEarned)}</p>
          <p className="text-[11px] text-mist">XP hoy</p>
        </Card>
        <Card className="!p-3">
          <p className="font-display text-xl font-black text-neon-violet">{report.sessionsCompleted}</p>
          <p className="text-[11px] text-mist">Sesiones</p>
        </Card>
        <Card className="!p-3">
          <p className="font-display text-xl font-black text-ember">
            {report.components.training != null ? `${report.components.training.toFixed(0)}%` : '—'}
          </p>
          <p className="text-[11px] text-mist">Entreno</p>
        </Card>
      </div>
    </div>
  );
}
