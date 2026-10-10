/**
 * FORJA — Esquemas Zod de validación (entradas y salidas).
 * Se usan tanto en cliente (formularios) como en servidor (API).
 * El servidor NUNCA confía en cálculos enviados por el cliente.
 */
import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)');

export const heroNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(24)
  .regex(/^[\p{L}\p{N} _-]+$/u);

export const profileSchema = z.object({
  heroName: heroNameSchema,
  combatStyle: z.enum(['guardian', 'cazador', 'sabio']).optional(),
  dailyGoalXp: z.number().int().min(5).max(500).default(30),
});

export const exerciseEntrySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    category: z.enum(['strength', 'bodyweight', 'cardio', 'mobility', 'technique']),
    sets: z.number().int().min(0).max(200).optional(),
    reps: z.number().int().min(0).max(1000).optional(),
    loadKg: z.number().min(0).max(600).optional(),
    durationMin: z.number().min(0).max(1440).optional(),
    targetMet: z.boolean().optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((val, ctx) => {
    const isSets = val.category === 'strength' || val.category === 'bodyweight';
    const isTimed = val.category === 'cardio' || val.category === 'mobility' || val.category === 'technique';
    if (isSets && !(val.sets != null && val.sets > 0)) {
      ctx.addIssue({ code: 'custom', message: 'Indica al menos 1 serie', path: ['sets'] });
    }
    if (isTimed && !(val.durationMin != null && val.durationMin > 0)) {
      ctx.addIssue({ code: 'custom', message: 'Indica la duración en minutos', path: ['durationMin'] });
    }
  });

export const createSessionSchema = z.object({
  /** Clave de idempotencia generada por el cliente (UUID) */
  idempotencyKey: z.string().uuid(),
  date: isoDate,
  status: z.enum(['planned', 'completed']).default('completed'),
  isRestDay: z.boolean().optional(),
  exercises: z.array(exerciseEntrySchema).min(1).max(30),
});

export const updateSessionSchema = z.object({
  status: z.enum(['planned', 'completed', 'cancelled']).optional(),
  exercises: z.array(exerciseEntrySchema).min(1).max(30).optional(),
  date: isoDate.optional(),
});

export const sleepLogSchema = z.object({
  date: isoDate,
  bedTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM)'),
  wakeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM)'),
  quality: z.number().int().min(1).max(5),
  notes: z.string().trim().max(500).optional(),
});

export const nutritionLogSchema = z.object({
  date: isoDate,
  meal: z.enum(['desayuno', 'comida', 'merienda', 'cena', 'snack']),
  description: z.string().trim().min(1).max(300),
  waterMl: z.number().int().min(0).max(5000).optional(),
});

export const bodyProgressSchema = z.object({
  date: isoDate,
  weightKg: z.number().min(25).max(350).optional(),
  notes: z.string().trim().max(500).optional(),
  mediaId: z.string().uuid().optional(),
});

export const habitSchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().trim().min(1).max(80),
  enabled: z.boolean(),
});

export const settingsSchema = z.object({
  dailyGoalXp: z.number().int().min(5).max(500),
  habits: z.array(habitSchema).max(12),
  plannedRestDays: z.array(z.number().int().min(0).max(6)).max(7),
  effectsEnabled: z.boolean(),
  reduceMotion: z.boolean(),
});

export const habitCheckSchema = z.object({
  date: isoDate,
  habitId: z.string().min(1).max(60),
  done: z.boolean(),
});

/** Respuesta validada de una escena generada por IA */
export const aiSceneSchema = z.object({
  title: z.string().min(1).max(120),
  narration: z.string().min(20).max(1500),
  backgroundKey: z.enum(['forge', 'dojo', 'rooftop', 'track', 'library', 'arena']),
  characterKey: z.enum(['naia', 'rook', 'mira', 'temo', 'kade']).optional(),
  choices: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        label: z.string().min(1).max(120),
        effect: z
          .object({
            flag: z.string().min(1).max(60).optional(),
            xpBonus: z.number().int().min(0).max(25).optional(),
            unlockCosmetic: z.string().min(1).max(60).optional(),
          })
          .optional(),
      }),
    )
    .min(1)
    .max(4),
});

export const storyChoiceSchema = z.object({
  sceneId: z.string().min(1).max(120),
  choiceId: z.string().min(1).max(120),
});

export const exportRequestSchema = z.object({
  format: z.enum(['json']),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type SleepLogInput = z.infer<typeof sleepLogSchema>;
export type NutritionLogInput = z.infer<typeof nutritionLogSchema>;
