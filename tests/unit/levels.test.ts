import { describe, expect, it } from 'vitest';
import {
  detectLevelUps,
  levelForXp,
  levelProgress,
  xpRequiredForLevel,
} from '@/lib/gamification/levels';

describe('xpRequiredForLevel — umbral 100 × L²', () => {
  it('nivel 0 requiere 0 XP', () => {
    expect(xpRequiredForLevel(0)).toBe(0);
  });
  it('niveles 1, 2 y 3', () => {
    expect(xpRequiredForLevel(1)).toBe(100);
    expect(xpRequiredForLevel(2)).toBe(400);
    expect(xpRequiredForLevel(3)).toBe(900);
  });
  it('niveles altos', () => {
    expect(xpRequiredForLevel(10)).toBe(10_000);
  });
});

describe('levelForXp — fronteras exactas', () => {
  it.each([
    [0, 0],
    [1, 0],
    [99, 0],
    [100, 1],
    [101, 1],
    [399, 1],
    [400, 2],
    [401, 2],
    [899, 2],
    [900, 3],
    [901, 3],
    [1599, 3],
    [1600, 4],
  ])('XP %i => nivel %i', (xp, level) => {
    expect(levelForXp(xp)).toBe(level);
  });

  it('valores inválidos dan nivel 0', () => {
    expect(levelForXp(-50)).toBe(0);
    expect(levelForXp(NaN)).toBe(0);
  });
});

describe('levelProgress — barra entre umbrales', () => {
  it('a mitad del nivel 1 el progreso es 0.5', () => {
    // Nivel 1: 100..400 => 250 XP = 150/300 = 0.5
    const p = levelProgress(250);
    expect(p.level).toBe(1);
    expect(p.xpIntoLevel).toBe(150);
    expect(p.xpForNextLevel).toBe(300);
    expect(p.progress).toBeCloseTo(0.5);
  });

  it('en el umbral exacto el progreso es 0', () => {
    const p = levelProgress(400);
    expect(p.level).toBe(2);
    expect(p.progress).toBe(0);
  });

  it('justo antes del umbral el progreso tiende a 1 sin pasarse', () => {
    const p = levelProgress(399);
    expect(p.level).toBe(1);
    expect(p.progress).toBeLessThan(1);
    expect(p.progress).toBeCloseTo(299 / 300);
  });
});

describe('detectLevelUps', () => {
  it('sin subida devuelve vacío', () => {
    expect(detectLevelUps(150, 250)).toEqual([]);
  });
  it('detecta la subida exacta en la frontera', () => {
    expect(detectLevelUps(399, 400)).toEqual([2]);
  });
  it('detecta subidas múltiples', () => {
    expect(detectLevelUps(50, 950)).toEqual([1, 2, 3]);
  });
  it('no detecta bajadas', () => {
    expect(detectLevelUps(500, 100)).toEqual([]);
  });
});
