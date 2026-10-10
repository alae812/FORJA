import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: 'violet' | 'cyan' | null;
}) {
  const glowCls = glow === 'violet' ? 'glow-violet' : glow === 'cyan' ? 'glow-cyan' : '';
  return (
    <div className={`glass rounded-2xl p-4 sm:p-5 ${glowCls} ${className}`}>{children}</div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display text-xl font-bold text-bone">{children}</h2>
      {action}
    </div>
  );
}

export function Badge({
  children,
  color = 'violet',
}: {
  children: ReactNode;
  color?: 'violet' | 'cyan' | 'ember' | 'green' | 'red' | 'gray';
}) {
  const colors: Record<string, string> = {
    violet: 'bg-violet-500/15 text-neon-violet border-violet-500/30',
    cyan: 'bg-cyan-500/15 text-neon-cyan border-cyan-500/30',
    ember: 'bg-orange-500/15 text-ember border-orange-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    red: 'bg-red-500/15 text-blood border-red-500/30',
    gray: 'bg-white/5 text-mist border-white/10',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${colors[color]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-8 text-center">
      <div className="text-4xl mb-3" aria-hidden>{icon}</div>
      <h3 className="font-display text-lg font-bold mb-1">{title}</h3>
      <p className="text-mist text-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3" role="status" aria-label={label}>
      <div className="w-10 h-10 rounded-full border-2 border-line border-t-neon-violet animate-spin" />
      <p className="text-mist text-sm">{label}</p>
    </div>
  );
}
