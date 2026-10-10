import { describe, expect, it } from 'vitest';
import {
  aiSceneSchema,
  createSessionSchema,
  nutritionLogSchema,
  sleepLogSchema,
} from '@/lib/validation/schemas';

describe('createSessionSchema', () => {
  const valid = {
    idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
    date: '2026-10-10',
    status: 'completed' as const,
    exercises: [{ name: 'Press banca', category: 'strength' as const, sets: 4, reps: 8, loadKg: 60 }],
  };

  it('acepta una sesión válida', () => {
    expect(createSessionSchema.safeParse(valid).success).toBe(true);
  });

  it('exige clave de idempotencia UUID', () => {
    const rest = { ...valid };
    delete (rest as Partial<typeof rest>).idempotencyKey;
    expect(createSessionSchema.safeParse(rest).success).toBe(false);
    expect(
      createSessionSchema.safeParse({ ...valid, idempotencyKey: 'no-uuid' }).success,
    ).toBe(false);
  });

  it('rechaza ejercicio de fuerza sin series', () => {
    const bad = {
      ...valid,
      exercises: [{ name: 'Sentadilla', category: 'strength' as const, sets: 0 }],
    };
    expect(createSessionSchema.safeParse(bad).success).toBe(false);
  });

  it('rechaza cardio sin duración', () => {
    const bad = {
      ...valid,
      exercises: [{ name: 'Correr', category: 'cardio' as const }],
    };
    expect(createSessionSchema.safeParse(bad).success).toBe(false);
  });

  it('rechaza valores imposibles', () => {
    const bad = {
      ...valid,
      exercises: [{ name: 'Correr', category: 'cardio' as const, durationMin: 99999 }],
    };
    expect(createSessionSchema.safeParse(bad).success).toBe(false);
  });

  it('rechaza sesión sin ejercicios', () => {
    expect(createSessionSchema.safeParse({ ...valid, exercises: [] }).success).toBe(false);
  });
});

describe('sleepLogSchema', () => {
  it('acepta un registro válido', () => {
    expect(
      sleepLogSchema.safeParse({
        date: '2026-10-10',
        bedTime: '23:30',
        wakeTime: '07:15',
        quality: 4,
      }).success,
    ).toBe(true);
  });

  it('rechaza horas mal formadas y calidad fuera de rango', () => {
    expect(
      sleepLogSchema.safeParse({
        date: '2026-10-10',
        bedTime: '25:00',
        wakeTime: '07:15',
        quality: 4,
      }).success,
    ).toBe(false);
    expect(
      sleepLogSchema.safeParse({
        date: '2026-10-10',
        bedTime: '23:30',
        wakeTime: '07:15',
        quality: 9,
      }).success,
    ).toBe(false);
  });
});

describe('nutritionLogSchema', () => {
  it('acepta comidas válidas', () => {
    expect(
      nutritionLogSchema.safeParse({
        date: '2026-10-10',
        meal: 'comida',
        description: 'Arroz con pollo y ensalada',
        waterMl: 500,
      }).success,
    ).toBe(true);
  });
});

describe('aiSceneSchema', () => {
  it('acepta una escena válida', () => {
    expect(
      aiSceneSchema.safeParse({
        title: 'La primera chispa',
        narration: 'El yunque resuena cuando Naia aparece entre las brasas para guiarte.',
        backgroundKey: 'forge',
        characterKey: 'naia',
        choices: [{ id: 'c1', label: 'Aceptar el desafío' }],
      }).success,
    ).toBe(true);
  });

  it('rechaza narración demasiado corta o sin elecciones', () => {
    expect(
      aiSceneSchema.safeParse({
        title: 'X',
        narration: 'Corta.',
        backgroundKey: 'forge',
        choices: [],
      }).success,
    ).toBe(false);
  });

  it('rechaza backgroundKey desconocido', () => {
    expect(
      aiSceneSchema.safeParse({
        title: 'X',
        narration: 'Narración suficientemente larga para pasar la validación mínima.',
        backgroundKey: 'volcano',
        choices: [{ id: 'c1', label: 'Ir' }],
      }).success,
    ).toBe(false);
  });
});
