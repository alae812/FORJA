/**
 * FORJA — Cálculo de XP de sesiones de entrenamiento.
 * Función pura: mismo input + mismo uso diario => mismo resultado.
 * El servidor es la única autoridad; el cliente nunca envía XP calculada.
 */
import type { AttributeKey, ExerciseCategory, XpBreakdownItem } from '@/types';
import { DAILY_CAPS, XP_RULES } from './config';

export interface SessionXpExerciseInput {
  category: ExerciseCategory;
  sets?: number;
  durationMin?: number;
  targetMet?: boolean;
}

/** Consumo diario acumulado ANTES de esta sesión (para aplicar límites) */
export interface DayUsage {
  sets: number;
  setBonuses: number;
  cardioMin: number;
  mobilityMin: number;
  sessionsCompleted: number;
}

export const EMPTY_USAGE: DayUsage = {
  sets: 0,
  setBonuses: 0,
  cardioMin: 0,
  mobilityMin: 0,
  sessionsCompleted: 0,
};

const round1 = (n: number): number => Math.round(n * 10) / 10;
const clampInt = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.floor(Number.isFinite(n) ? n : 0)));
const clampNum = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? n : 0));

function attributeOf(category: ExerciseCategory): AttributeKey {
  if (category === 'strength' || category === 'bodyweight') return 'str';
  if (category === 'cardio') return 'sta';
  return 'wis';
}

function fmtMin(mins: number): string {
  const m = round1(mins);
  return `${m} min`;
}

export interface SessionXpResult {
  items: XpBreakdownItem[];
  totalXp: number;
  /** Uso diario DESPUÉS de aplicar esta sesión */
  usage: DayUsage;
  /** true si algún límite diario recortó la recompensa */
  capped: boolean;
}

/**
 * Calcula la XP de una sesión respetando los límites diarios.
 * No otorga XP por encima de los topes: el excedente simplemente no puntúa.
 */
export function calculateSessionXp(
  exercises: SessionXpExerciseInput[],
  completed: boolean,
  usage: DayUsage,
): SessionXpResult {
  const items: XpBreakdownItem[] = [];
  const next: DayUsage = { ...usage };
  let capped = false;

  for (const ex of exercises) {
    const attribute = attributeOf(ex.category);

    if (ex.category === 'strength' || ex.category === 'bodyweight') {
      const sets = clampInt(ex.sets ?? 0, 0, 500);
      const allowed = Math.max(0, DAILY_CAPS.maxSets - next.sets);
      const counted = Math.min(sets, allowed);
      if (sets > counted) capped = true;
      if (counted > 0) {
        items.push({
          kind: 'set',
          attribute,
          xp: round1(counted * XP_RULES.SET_XP),
          detail: `${counted} ${counted === 1 ? 'serie válida' : 'series válidas'} × ${XP_RULES.SET_XP} XP`,
          units: counted,
        });
        next.sets += counted;
      }
      if (ex.targetMet) {
        const allowedB = Math.max(0, DAILY_CAPS.maxSetBonuses - next.setBonuses);
        const countedB = Math.min(counted, allowedB);
        if (counted > countedB) capped = true;
        if (countedB > 0) {
          items.push({
            kind: 'set_bonus',
            attribute,
            xp: round1(countedB * XP_RULES.SET_BONUS_XP),
            detail: `Bonus de objetivo: ${countedB} ${countedB === 1 ? 'serie' : 'series'} × ${XP_RULES.SET_BONUS_XP} XP`,
            units: countedB,
          });
          next.setBonuses += countedB;
        }
      }
    } else if (ex.category === 'cardio') {
      const mins = clampNum(ex.durationMin ?? 0, 0, 1440);
      const allowed = Math.max(0, DAILY_CAPS.maxCardioMin - next.cardioMin);
      const counted = Math.min(mins, allowed);
      if (mins > counted) capped = true;
      if (counted > 0) {
        items.push({
          kind: 'cardio',
          attribute,
          xp: round1(counted * XP_RULES.CARDIO_XP_PER_MIN),
          detail: `${fmtMin(counted)} de cardio × ${XP_RULES.CARDIO_XP_PER_MIN} XP/min`,
          units: round1(counted),
        });
        next.cardioMin += counted;
      }
    } else {
      // mobility | technique -> WIS
      const mins = clampNum(ex.durationMin ?? 0, 0, 1440);
      const allowed = Math.max(0, DAILY_CAPS.maxMobilityMin - next.mobilityMin);
      const counted = Math.min(mins, allowed);
      if (mins > counted) capped = true;
      if (counted > 0) {
        items.push({
          kind: 'mobility',
          attribute,
          xp: round1(counted * XP_RULES.MOBILITY_XP_PER_MIN),
          detail: `${fmtMin(counted)} de movilidad/técnica × ${XP_RULES.MOBILITY_XP_PER_MIN} XP/min`,
          units: round1(counted),
        });
        next.mobilityMin += counted;
      }
    }
  }

  if (completed) {
    if (next.sessionsCompleted < DAILY_CAPS.maxSessionsCompleted) {
      // El bonus de sesión completada va al atributo dominante de la sesión.
      const byAttr = new Map<AttributeKey, number>();
      for (const it of items) byAttr.set(it.attribute, (byAttr.get(it.attribute) ?? 0) + it.xp);
      let dominant: AttributeKey = 'str';
      let best = -1;
      for (const [a, x] of byAttr) {
        if (x > best) {
          best = x;
          dominant = a;
        }
      }
      items.push({
        kind: 'session_complete',
        attribute: dominant,
        xp: XP_RULES.SESSION_COMPLETE_XP,
        detail: 'Sesión planificada completada',
        units: 1,
      });
      next.sessionsCompleted += 1;
    } else {
      capped = true;
    }
  }

  const totalXp = round1(items.reduce((s, i) => s + i.xp, 0));
  return { items, totalXp, usage: next, capped };
}

export interface DailyGoalResult {
  awarded: boolean;
  xp: number;
}

/**
 * Bonus de objetivo diario: se otorga una sola vez al día cuando la XP
 * de entrenamiento del día alcanza el objetivo configurable.
 */
export function maybeAwardDailyGoal(
  trainingXpToday: number,
  dailyGoalXp: number,
  alreadyAwarded: boolean,
): DailyGoalResult {
  if (alreadyAwarded) return { awarded: false, xp: 0 };
  if (dailyGoalXp <= 0) return { awarded: false, xp: 0 };
  if (trainingXpToday >= dailyGoalXp) return { awarded: true, xp: XP_RULES.DAILY_GOAL_XP };
  return { awarded: false, xp: 0 };
}
