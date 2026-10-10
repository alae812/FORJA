'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface XpBarProps {
  progress: number; // 0..1
  animated?: boolean;
  height?: string;
  gradient?: string;
  label?: string;
}

/**
 * Barra de XP animada. Respeta prefers-reduced-motion (versión estática).
 */
export function XpBar(props: XpBarProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion || props.animated === false) {
    return <StaticXpBar {...props} />;
  }
  return <AnimatedXpBar {...props} />;
}

function barClass(height: string) {
  return `w-full ${height} rounded-full bg-black/50 border border-line overflow-hidden xp-shine`;
}

function StaticXpBar({ progress, height = 'h-3', gradient = 'from-violet-500 via-fuchsia-400 to-cyan-400', label }: XpBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <div aria-label={label ?? `Progreso ${(clamped * 100).toFixed(0)}%`}>
      <div className={barClass(height)}>
        <div className={`h-full rounded-full bg-gradient-to-r ${gradient}`} style={{ width: `${clamped * 100}%` }} />
      </div>
    </div>
  );
}

function AnimatedXpBar({ progress, height = 'h-3', gradient = 'from-violet-500 via-fuchsia-400 to-cyan-400', label }: XpBarProps) {
  const [display, setDisplay] = useState(0);
  const clamped = Math.min(1, Math.max(0, progress));

  useEffect(() => {
    const from = display;
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(from + (clamped - from) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped]);

  return (
    <div aria-label={label ?? `Progreso ${(clamped * 100).toFixed(0)}%`}>
      <div className={barClass(height)}>
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
          style={{ width: `${display * 100}%` }}
        />
      </div>
    </div>
  );
}

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}

/** Contador animado de números (estático con reduced motion) */
export function AnimatedNumber({ value, duration = 0.9, format = (n: number) => Math.round(n).toString() }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <span>{format(value)}</span>;
  }
  return <AnimatedNumberInner value={value} duration={duration} format={format} />;
}

function AnimatedNumberInner({ value, duration = 0.9, format }: Required<AnimatedNumberProps>) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const from = display;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(from + (value - from) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span>{format(display)}</span>;
}
