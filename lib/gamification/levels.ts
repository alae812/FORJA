/**
 * FORJA — Cálculo de niveles.
 * Umbral: XP_requerida(L) = 100 × L² (L ≥ 1); umbral(0) = 0.
 * Nivel = mayor entero L cuyo umbral no excede la XP total.
 */
import { LEVEL_FORMULA } from './config';

/** XP acumulada necesaria para alcanzar el nivel L */
export function xpRequiredForLevel(level: number): number {
  if (!Number.isFinite(level) || level <= 0) return 0;
  const l = Math.floor(level);
  return LEVEL_FORMULA.base * l ** LEVEL_FORMULA.exponent;
}

/** Nivel correspondiente a una XP total (siempre ≥ 0) */
export function levelForXp(totalXp: number): number {
  if (!Number.isFinite(totalXp) || totalXp <= 0) return 0;
  return Math.floor(Math.sqrt(totalXp / LEVEL_FORMULA.base));
}

export interface LevelProgress {
  level: number;
  /** XP conseguida dentro del nivel actual */
  xpIntoLevel: number;
  /** XP necesaria para completar el nivel actual */
  xpForNextLevel: number;
  /** 0..1 progreso hacia el siguiente nivel */
  progress: number;
  totalXp: number;
}

/** Progreso entre el umbral del nivel actual y el del siguiente */
export function levelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = levelForXp(xp);
  const base = xpRequiredForLevel(level);
  const next = xpRequiredForLevel(level + 1);
  const span = next - base;
  return {
    level,
    xpIntoLevel: xp - base,
    xpForNextLevel: span,
    progress: span <= 0 ? 1 : Math.min(1, Math.max(0, (xp - base) / span)),
    totalXp: xp,
  };
}

/**
 * Detecta subida de nivel entre dos totales de XP.
 * Devuelve los niveles intermedios superados (normalmente 0 o 1).
 */
export function detectLevelUps(beforeXp: number, afterXp: number): number[] {
  const from = levelForXp(beforeXp);
  const to = levelForXp(afterXp);
  if (to <= from) return [];
  const ups: number[] = [];
  for (let l = from + 1; l <= to; l++) ups.push(l);
  return ups;
}
