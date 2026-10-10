/**
 * FORJA — Report Card diario.
 * R = 0,45·T + 0,25·H + 0,20·C + 0,10·W (pesos en lib/gamification/config.ts)
 *
 * Reglas de honestidad:
 * - Cada componente es 0–100 o null (ausencia de datos). Nunca se inventa un 0.
 * - Si falta algún componente esencial => "Evaluación incompleta" + lista de qué falta.
 * - El rango se calcula con precisión completa; el redondeo a 1 decimal es solo presentación.
 * - El descanso planificado NO penaliza: cuenta como adherencia.
 * - Sin juicios morales ni recomendaciones médicas.
 */
import type { DailyReport } from '@/types';
import { REPORT_RANKS, REPORT_WEIGHTS, type ReportRank } from './config';

export interface ReportInputs {
  date: string; // YYYY-MM-DD
  profileId: string;
  /** Objetivo diario de XP configurado */
  dailyGoalXp: number;
  /** XP de entrenamiento conseguida hoy */
  trainingXpToday: number;
  /** Sesiones planificadas hoy / completadas hoy */
  sessionsPlannedToday: number;
  sessionsCompletedToday: number;
  /** ¿Hoy es día de descanso planificado y no se entrenó? */
  restDayAdhered: boolean;
  /** Hábitos configurados / cumplidos hoy */
  habitsTotal: number;
  habitsDone: number;
  /** Ventana de 7 días: sesiones+descansos planificados vs cumplidos */
  planWindowTotal: number;
  planWindowDone: number;
  /** Calidad de sueño percibida 1–5 (null = sin registro) */
  sleepQuality: number | null;
  /** Bienestar autodeclarado 0–100 (null = sin registro) */
  wellbeingScore: number | null;
  xpEarned: number;
}

const clamp100 = (n: number): number => Math.min(100, Math.max(0, n));
export const round1 = (n: number): number => Math.round(n * 10) / 10;

export interface ReportComputation {
  score: number | null;
  rank: ReportRank | null;
  components: DailyReport['components'];
  missing: string[];
  isRestDay: boolean;
  recommendation: string;
}

export function rankForScore(score: number): ReportRank {
  for (const r of REPORT_RANKS) {
    if (score >= r.min && (r.rank === 'S' ? score <= r.max : score < r.max)) return r.rank;
  }
  return 'D';
}

function buildRecommendation(
  c: DailyReport['components'],
  missing: string[],
  isRestDay: boolean,
): string {
  if (missing.length > 0) {
    return `Registra lo que falta (${missing.join(', ').toLowerCase()}) para completar tu evaluación de mañana.`;
  }
  if (isRestDay) {
    return 'Día de descanso cumplido: la recuperación también entrena. Mañana, la forja te espera.';
  }
  const entries: [string, number][] = [
    ['entrenamiento', c.training ?? 100],
    ['hábitos', c.habits ?? 100],
    ['constancia', c.consistency ?? 100],
    ['recuperación', c.wellbeing ?? 100],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  const [weakest, value] = entries[0];
  if (value >= 90) return 'Jornada casi perfecta. Mantén el ritmo: la constancia forja leyendas.';
  switch (weakest) {
    case 'entrenamiento':
      return 'El entrenamiento quedó corto hoy. Una sesión breve mañana mantiene viva la llama.';
    case 'hábitos':
      return 'Retoma un hábito pequeño hoy (agua, movilidad): los grandes cambios nacen de lo mínimo.';
    case 'constancia':
      return 'La constancia flaquea: planifica tu próxima sesión ahora y protégela en tu agenda.';
    default:
      return 'Cuida la recuperación esta noche: dormir bien es parte del entrenamiento.';
  }
}

export function computeDailyReport(input: ReportInputs): ReportComputation {
  const missing: string[] = [];
  const isRestDay = input.restDayAdhered;

  // T — entrenamiento (0–100)
  let training: number;
  if (isRestDay) {
    training = 100; // descanso planificado = adherencia, no penaliza
  } else if (input.sessionsPlannedToday > 0) {
    training = clamp100((100 * input.sessionsCompletedToday) / input.sessionsPlannedToday);
  } else {
    training = input.dailyGoalXp > 0
      ? clamp100((100 * input.trainingXpToday) / input.dailyGoalXp)
      : 0;
  }

  // H — hábitos (null si no hay hábitos configurados)
  let habits: number | null = null;
  if (input.habitsTotal > 0) {
    habits = clamp100((100 * input.habitsDone) / input.habitsTotal);
  } else {
    missing.push('Hábitos saludables (configúralos en Ajustes)');
  }

  // C — consistencia con el plan (null si no hay plan en la ventana)
  let consistency: number | null = null;
  if (input.planWindowTotal > 0) {
    consistency = clamp100((100 * input.planWindowDone) / input.planWindowTotal);
  } else {
    missing.push('Plan personal (programa sesiones o descansos)');
  }

  // W — recuperación y bienestar autodeclarados
  let wellbeing: number | null = null;
  const parts: number[] = [];
  if (input.sleepQuality != null) parts.push(clamp100((100 * input.sleepQuality) / 5));
  if (input.wellbeingScore != null) parts.push(clamp100(input.wellbeingScore));
  if (parts.length > 0) {
    wellbeing = parts.reduce((a, b) => a + b, 0) / parts.length;
  } else {
    missing.push('Sueño o bienestar (registra tu descanso)');
  }

  let score: number | null = null;
  let rank: ReportRank | null = null;
  if (missing.length === 0 && habits != null && consistency != null && wellbeing != null) {
    score =
      REPORT_WEIGHTS.training * training +
      REPORT_WEIGHTS.habits * habits +
      REPORT_WEIGHTS.consistency * consistency +
      REPORT_WEIGHTS.wellbeing * wellbeing;
    score = Math.min(100, Math.max(0, score));
    rank = rankForScore(score);
  }

  const components: DailyReport['components'] = { training, habits, consistency, wellbeing };
  return {
    score,
    rank,
    components,
    missing,
    isRestDay,
    recommendation: buildRecommendation(components, missing, isRestDay),
  };
}
