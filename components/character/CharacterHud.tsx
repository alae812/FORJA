'use client';
import { motion } from 'framer-motion';
import { ATTRIBUTES, type AttributeKey } from '@/types';
import { XpBar } from '@/components/ui/XpBar';
import { Card } from '@/components/ui/primitives';

const ATTR_STYLE: Record<AttributeKey, { icon: string; gradient: string; text: string }> = {
  str: { icon: '💪', gradient: 'from-orange-500 to-red-500', text: 'text-ember' },
  sta: { icon: '🔥', gradient: 'from-violet-500 to-fuchsia-500', text: 'text-neon-violet' },
  wis: { icon: '🔮', gradient: 'from-cyan-400 to-blue-500', text: 'text-neon-cyan' },
};

/** HUD compacto del personaje para el dashboard */
export function CharacterHud({
  heroName,
  level,
  progress,
  xpIntoLevel,
  xpForNextLevel,
  combatStyle,
}: {
  heroName: string;
  level: number;
  progress: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  combatStyle?: string;
}) {
  return (
    <Card glow="violet" className="relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 90% at 50% 120%, rgba(167,139,250,0.35), transparent 70%)',
        }}
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs text-mist uppercase tracking-widest">Héroe</p>
            <h2 className="font-display text-2xl font-black text-glow-violet">{heroName}</h2>
            {combatStyle && (
              <p className="text-xs text-mist capitalize">Estilo: {combatStyle}</p>
            )}
          </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-[0_0_25px_rgba(167,139,250,0.5)]"
            aria-label={`Nivel ${level}`}
          >
            <div className="text-center leading-none">
              <div className="text-[10px] font-bold text-[#06060c]/70">NV</div>
              <div className="font-display text-2xl font-black text-[#06060c]">{level}</div>
            </div>
          </motion.div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-mist mb-1.5">
            <span>
              {Math.round(xpIntoLevel)} / {Math.round(xpForNextLevel)} XP
            </span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <XpBar progress={progress} label={`Progreso al nivel ${level + 1}`} />
        </div>
      </div>
    </Card>
  );
}

/** Tarjeta de atributo con su XP */
export function AttributeCard({
  attr,
  xp,
  delay = 0,
}: {
  attr: AttributeKey;
  xp: number;
  delay?: number;
}) {
  const meta = ATTRIBUTES[attr];
  const style = ATTR_STYLE[attr];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <Card className="text-center">
        <div className="text-2xl mb-1" aria-hidden>{style.icon}</div>
        <p className={`font-display font-bold ${style.text}`}>{meta.short}</p>
        <p className="text-xs text-mist mb-2">{meta.name}</p>
        <div className={`h-1.5 rounded-full bg-black/50 overflow-hidden mb-1.5`}>
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${style.gradient}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (xp % 500) / 5)}%` }}
            transition={{ delay: delay + 0.2, duration: 0.6 }}
          />
        </div>
        <p className="text-sm font-bold">{Math.round(xp)} XP</p>
      </Card>
    </motion.div>
  );
}
