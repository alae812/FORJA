'use client';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * Secuencia cinematográfica de subida de nivel:
 * atenuación del fondo → anillos expansivos → aura luminosa → partículas
 * limitadas → destello controlado → contador de nivel → recompensas.
 * Respeta prefers-reduced-motion (versión estática simplificada).
 */
export function LevelUpOverlay({
  open,
  fromLevel,
  toLevel,
  rewards,
  onClose,
}: {
  open: boolean;
  fromLevel: number;
  toLevel: number;
  rewards: { id: string; name: string; description: string }[];
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  // El overlay se monta de nuevo con cada subida (key por evento), así que el
  // estado inicial desde props es correcto. Con reduced motion (o sin subida
  // real) se muestra el nivel final directamente.
  const [shownLevel, setShownLevel] = useState(
    reduceMotion || toLevel <= fromLevel ? toLevel : fromLevel,
  );

  useEffect(() => {
    if (!open || reduceMotion || toLevel <= fromLevel) return;
    let current = fromLevel;
    const id = setInterval(() => {
      current += 1;
      setShownLevel(current);
      if (current >= toLevel) clearInterval(id);
    }, 450);
    return () => clearInterval(id);
  }, [open, fromLevel, toLevel, reduceMotion]);

  // Partículas limitadas y deterministas (sin aleatoriedad en render)
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const dist = 90 + ((i * 37) % 70);
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          delay: 0.5 + (i % 8) * 0.08,
          size: 3 + ((i * 13) % 5),
        };
      }),
    [],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6"
          role="alertdialog"
          aria-modal="true"
          aria-label={`Has subido al nivel ${toLevel}`}
        >
          {/* Anillos expansivos */}
          {!reduceMotion &&
            [0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute w-40 h-40 rounded-full border-2 border-neon-violet/60"
                initial={{ scale: 0.3, opacity: 0.9 }}
                animate={{ scale: [0.3, 2.4], opacity: [0.9, 0] }}
                transition={{ duration: 1.6, delay: 0.3 + i * 0.35, ease: 'easeOut' }}
                aria-hidden
              />
            ))}

          {/* Aura luminosa */}
          <motion.div
            className="absolute w-72 h-72 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(167,139,250,0.5) 0%, rgba(34,211,238,0.25) 45%, transparent 70%)',
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.15, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            aria-hidden
          />

          {/* Partículas */}
          {!reduceMotion &&
            particles.map((p, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-cyan-300"
                style={{ width: p.size, height: p.size }}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: p.x, y: p.y, opacity: 0 }}
                transition={{ duration: 1.4, delay: p.delay, ease: 'easeOut' }}
                aria-hidden
              />
            ))}

          <motion.div
            initial={reduceMotion ? {} : { scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.55, type: 'spring', damping: 18 }}
            className="relative text-center max-w-sm"
          >
            <p className="font-display text-sm tracking-[0.3em] text-neon-cyan mb-2">
              ¡NIVEL SUPERADO!
            </p>
            <div className="font-display text-8xl font-black text-glow-violet mb-2 tabular-nums">
              {shownLevel}
            </div>
            <p className="text-mist mb-6">
              De nivel {fromLevel} a <span className="text-bone font-bold">{toLevel}</span>. La
              forja reconoce tu constancia.
            </p>

            {rewards.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : 1.4 }}
                className="glass rounded-2xl p-4 mb-6 text-left"
              >
                <p className="font-display font-bold text-ember mb-2">🎁 Recompensas desbloqueadas</p>
                <ul className="space-y-1.5">
                  {rewards.map((r) => (
                    <li key={r.id} className="text-sm">
                      <span className="font-bold text-bone">{r.name}</span>
                      <span className="text-mist"> — {r.description}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            <Button size="lg" onClick={onClose} className="w-full">
              Continuar la historia ⚔️
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
