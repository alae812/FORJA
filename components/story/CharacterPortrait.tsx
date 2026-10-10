'use client';
import { CHARACTERS } from '@/lib/story/characters';
import type { CharacterKey } from '@/types';

/**
 * Retratos SVG originales y minimalistas (siluetas estilizadas con el color
 * del personaje). Diseño propio de FORJA, sin copiar estilos de franquicias.
 */
export function CharacterPortrait({ key_: k, size = 96 }: { key_: CharacterKey; size?: number }) {
  const c = CHARACTERS[k];
  const id = `g-${k}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${c.name}, ${c.title}`}
      className="rounded-2xl"
    >
      <defs>
        <radialGradient id={id} cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor={c.color} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0d0d17" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="16" fill={`url(#${id})`} />
      {k === 'naia' && (
        <g fill="#fff" opacity="0.9">
          <circle cx="50" cy="38" r="10" />
          <path d="M32 88 Q50 58 68 88 Z" />
          <circle cx="38" cy="24" r="2.5" fill={c.color} />
          <circle cx="62" cy="20" r="2" fill={c.color} />
          <circle cx="55" cy="30" r="1.6" fill="#fff" />
        </g>
      )}
      {k === 'rook' && (
        <g fill="#fff" opacity="0.9">
          <circle cx="50" cy="34" r="11" />
          <rect x="30" y="50" width="40" height="34" rx="10" />
          <rect x="62" y="44" width="8" height="26" rx="4" transform="rotate(24 66 57)" />
        </g>
      )}
      {k === 'mira' && (
        <g fill="#fff" opacity="0.9">
          <circle cx="50" cy="36" r="10" />
          <path d="M50 26 Q74 30 78 52 Q66 44 52 44 Z" />
          <path d="M34 88 Q50 60 66 88 Z" />
          <path d="M14 60 h18 M12 70 h22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        </g>
      )}
      {k === 'temo' && (
        <g fill="#fff" opacity="0.9">
          <circle cx="50" cy="36" r="10" />
          <path d="M34 88 Q50 62 66 88 Z" />
          <rect x="24" y="40" width="5" height="44" rx="2.5" transform="rotate(8 26 62)" />
          <circle cx="50" cy="18" r="7" fill="none" stroke="#fff" strokeWidth="2" opacity="0.6" />
        </g>
      )}
      {k === 'kade' && (
        <g fill="#fff" opacity="0.9">
          <circle cx="50" cy="36" r="10" />
          <path d="M40 34 l6 -8 l4 6 l6 -8" stroke={c.color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M32 88 Q50 60 68 88 Z" />
        </g>
      )}
    </svg>
  );
}
