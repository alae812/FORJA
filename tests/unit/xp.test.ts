import { describe, expect, it } from 'vitest';
import {
  EMPTY_USAGE,
  calculateSessionXp,
  maybeAwardDailyGoal,
} from '@/lib/gamification/xp';
import { DAILY_CAPS, XP_RULES } from '@/lib/gamification/config';

describe('calculateSessionXp', () => {
  it('serie válida de fuerza = 8 XP en STR', () => {
    const r = calculateSessionXp(
      [{ category: 'strength', sets: 3 }],
      false,
      EMPTY_USAGE,
    );
    expect(r.totalXp).toBe(24);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ kind: 'set', attribute: 'str', xp: 24 });
    expect(r.usage.sets).toBe(3);
  });

  it('bonus por objetivo: +2 XP por serie con targetMet', () => {
    const r = calculateSessionXp(
      [{ category: 'strength', sets: 4, targetMet: true }],
      false,
      EMPTY_USAGE,
    );
    expect(r.totalXp).toBe(4 * 8 + 4 * 2);
    expect(r.items.find((i) => i.kind === 'set_bonus')?.xp).toBe(8);
  });

  it('sin targetMet no hay bonus', () => {
    const r = calculateSessionXp(
      [{ category: 'bodyweight', sets: 2, targetMet: false }],
      false,
      EMPTY_USAGE,
    );
    expect(r.totalXp).toBe(16);
    expect(r.items.some((i) => i.kind === 'set_bonus')).toBe(false);
  });

  it('cardio prorrateado: 5 XP cada 5 min (1 XP/min) en STA', () => {
    const r = calculateSessionXp(
      [{ category: 'cardio', durationMin: 12.5 }],
      false,
      EMPTY_USAGE,
    );
    expect(r.totalXp).toBe(12.5);
    expect(r.items[0]).toMatchObject({ kind: 'cardio', attribute: 'sta' });
  });

  it('movilidad prorrateada: 3 XP cada 5 min (0,6 XP/min) en WIS', () => {
    const r = calculateSessionXp(
      [{ category: 'mobility', durationMin: 10 }],
      false,
      EMPTY_USAGE,
    );
    expect(r.totalXp).toBe(6);
    expect(r.items[0]).toMatchObject({ kind: 'mobility', attribute: 'wis' });
  });

  it('completar sesión planificada = +15 XP al atributo dominante', () => {
    const r = calculateSessionXp(
      [
        { category: 'strength', sets: 2 }, // 16 XP STR
        { category: 'cardio', durationMin: 30 }, // 30 XP STA
      ],
      true,
      EMPTY_USAGE,
    );
    const bonus = r.items.find((i) => i.kind === 'session_complete');
    expect(bonus).toMatchObject({ xp: 15, attribute: 'sta' });
    expect(r.totalXp).toBe(16 + 30 + 15);
  });

  it('respeta el límite diario de series', () => {
    const usage = { ...EMPTY_USAGE, sets: DAILY_CAPS.maxSets - 2 };
    const r = calculateSessionXp(
      [{ category: 'strength', sets: 10 }],
      false,
      usage,
    );
    expect(r.usage.sets).toBe(DAILY_CAPS.maxSets);
    expect(r.totalXp).toBe(2 * XP_RULES.SET_XP);
    expect(r.capped).toBe(true);
  });

  it('respeta el límite diario de cardio', () => {
    const usage = { ...EMPTY_USAGE, cardioMin: 115 };
    const r = calculateSessionXp(
      [{ category: 'cardio', durationMin: 30 }],
      false,
      usage,
    );
    expect(r.usage.cardioMin).toBe(120);
    expect(r.totalXp).toBe(5);
    expect(r.capped).toBe(true);
  });

  it('respeta el límite de sesiones completadas por día', () => {
    const usage = { ...EMPTY_USAGE, sessionsCompleted: DAILY_CAPS.maxSessionsCompleted };
    const r = calculateSessionXp(
      [{ category: 'strength', sets: 1 }],
      true,
      usage,
    );
    expect(r.items.some((i) => i.kind === 'session_complete')).toBe(false);
    expect(r.capped).toBe(true);
  });

  it('valores imposibles se recortan sin romper', () => {
    const r = calculateSessionXp(
      [
        { category: 'strength', sets: -5 },
        { category: 'cardio', durationMin: 10_000 },
      ],
      false,
      EMPTY_USAGE,
    );
    // series negativas => 0; cardio recortado al tope diario (120 min)
    expect(r.totalXp).toBe(120 * XP_RULES.CARDIO_XP_PER_MIN);
  });
});

describe('maybeAwardDailyGoal', () => {
  it('otorga +5 XP al alcanzar el objetivo, una sola vez', () => {
    expect(maybeAwardDailyGoal(30, 30, false)).toEqual({ awarded: true, xp: 5 });
    expect(maybeAwardDailyGoal(45, 30, false)).toEqual({ awarded: true, xp: 5 });
  });
  it('no otorga si ya se otorgó hoy', () => {
    expect(maybeAwardDailyGoal(100, 30, true)).toEqual({ awarded: false, xp: 0 });
  });
  it('no otorga si no se alcanza el objetivo', () => {
    expect(maybeAwardDailyGoal(29.9, 30, false)).toEqual({ awarded: false, xp: 0 });
  });
});
