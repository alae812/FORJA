'use client';
import { BACKGROUNDS } from '@/lib/story/characters';
import type { BackgroundKey } from '@/types';

/** Escenario renderizado con CSS/SVG originales (sin assets externos) */
export function BackgroundArt({ key_: k, className = '' }: { key_: BackgroundKey; className?: string }) {
  const bg = BACKGROUNDS[k];
  return (
    <div className={`relative overflow-hidden ${className}`} aria-label={bg.name}>
      <div className="absolute inset-0" style={{ background: bg.gradient }} aria-hidden />
      {/* Brasas / estrellas según escenario */}
      <svg className="absolute inset-0 w-full h-full opacity-40" aria-hidden preserveAspectRatio="none" viewBox="0 0 400 300">
        {Array.from({ length: 18 }, (_, i) => {
          const x = (i * 67 + 13) % 400;
          const y = (i * 41 + 29) % 300;
          const r = 1 + ((i * 7) % 3);
          return <circle key={i} cx={x} cy={y} r={r} fill={bg.accent} opacity={0.5 + ((i * 11) % 40) / 100} />;
        })}
        {k === 'forge' && (
          <g opacity={0.5}>
            <ellipse cx="200" cy="310" rx="180" ry="60" fill="#fb923c" opacity="0.35" />
            <ellipse cx="200" cy="300" rx="120" ry="40" fill="#fbbf24" opacity="0.3" />
          </g>
        )}
        {k === 'rooftop' && (
          <g opacity={0.6} fill="#0f172a">
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} x={i * 60 - 10} y={210 + ((i * 23) % 40)} width="46" height="120" />
            ))}
          </g>
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" aria-hidden />
    </div>
  );
}
