import { describe, expect, it } from 'vitest';
import { computeDailyReport, rankForScore } from '@/lib/gamification/report';

const base = {
  date: '2026-10-10',
  profileId: 'p1',
  dailyGoalXp: 30,
  trainingXpToday: 30,
  sessionsPlannedToday: 0,
  sessionsCompletedToday: 0,
  restDayAdhered: false,
  habitsTotal: 4,
  habitsDone: 4,
  planWindowTotal: 5,
  planWindowDone: 5,
  sleepQuality: 4,
  wellbeingScore: 80,
  xpEarned: 45,
};

describe('computeDailyReport', () => {
  it('día perfecto => 100 y rango S', () => {
    const r = computeDailyReport({
      ...base,
      trainingXpToday: 30,
      habitsDone: 4,
      planWindowDone: 5,
      sleepQuality: 5,
      wellbeingScore: 100,
    });
    expect(r.score).toBe(100);
    expect(r.rank).toBe('S');
    expect(r.missing).toEqual([]);
  });

  it('aplica la fórmula R = 0,45T + 0,25H + 0,20C + 0,10W', () => {
    // T=100, H=50 (2/4), C=80 (4/5), W=80 (4/5 y 80)
    const r = computeDailyReport({ ...base, habitsDone: 2, planWindowDone: 4 });
    // 0.45*100 + 0.25*50 + 0.20*80 + 0.10*80 = 45+12.5+16+8 = 81.5
    expect(r.score).toBeCloseTo(81.5);
    expect(r.rank).toBe('B');
  });

  it('datos incompletos => score null y lista de faltantes (sin inventar ceros)', () => {
    const r = computeDailyReport({
      ...base,
      habitsTotal: 0,
      habitsDone: 0,
      sleepQuality: null,
      wellbeingScore: null,
    });
    expect(r.score).toBeNull();
    expect(r.rank).toBeNull();
    expect(r.missing.length).toBeGreaterThan(0);
    // Los componentes presentes sí se calculan
    expect(r.components.training).toBe(100);
    expect(r.components.habits).toBeNull();
    expect(r.components.wellbeing).toBeNull();
  });

  it('descanso planificado no penaliza: T=100 y sigue siendo computable', () => {
    const r = computeDailyReport({
      ...base,
      restDayAdhered: true,
      trainingXpToday: 0,
    });
    expect(r.components.training).toBe(100);
    expect(r.isRestDay).toBe(true);
    expect(r.score).not.toBeNull();
  });

  it('T por sesiones planificadas vs completadas', () => {
    const r = computeDailyReport({
      ...base,
      sessionsPlannedToday: 2,
      sessionsCompletedToday: 1,
      trainingXpToday: 0,
    });
    expect(r.components.training).toBe(50);
  });
});

describe('rankForScore — rangos y precisión', () => {
  it.each([
    [100, 'S'],
    [95, 'S'],
    [94.99, 'A'],
    [85, 'A'],
    [84.99, 'B'],
    [70, 'B'],
    [69.99, 'C'],
    [50, 'C'],
    [49.99, 'D'],
    [0, 'D'],
  ])('score %i => rango %s', (score, rank) => {
    expect(rankForScore(score)).toBe(rank);
  });

  it('el rango usa precisión completa, no el valor redondeado', () => {
    // 94.96 se mostraría como 95.0 pero el rango debe ser A
    expect(rankForScore(94.96)).toBe('A');
  });
});
