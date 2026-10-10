/**
 * FORJA — Configuración central de fórmulas del juego.
 *
 * DISEÑO ORIGINAL. Estos números son reglas de juego de FORJA, no datos
 * atribuidos a ninguna app externa. Todos los pesos, límites y umbrales
 * viven aquí para que cliente y servidor no diverjan: la UI los importa
 * solo para mostrarlos; el cálculo real ocurre en el servidor.
 */

/** Recompensas de XP por acción (diseño original FORJA) */
export const XP_RULES = {
  /** Serie válida de fuerza / peso corporal registrada */
  SET_XP: 8,
  /** Bonus por cumplir el objetivo previsto de la serie */
  SET_BONUS_XP: 2,
  /** XP por minuto de cardio moderado (5 XP / 5 min, prorrateado) */
  CARDIO_XP_PER_MIN: 1,
  /** XP por minuto de movilidad o práctica técnica (3 XP / 5 min, prorrateado) */
  MOBILITY_XP_PER_MIN: 0.6,
  /** Completar una sesión planificada */
  SESSION_COMPLETE_XP: 15,
  /** Cumplir el objetivo diario configurable */
  DAILY_GOAL_XP: 5,
} as const;

/**
 * Límites diarios anti-spam. Son generosos pero impiden valores imposibles
 * y registros repetidos. Se muestran en la UI ("Límites diarios").
 */
export const DAILY_CAPS = {
  /** Series de fuerza/peso corporal con XP por día */
  maxSets: 30,
  /** Bonos de objetivo por día */
  maxSetBonuses: 30,
  /** Minutos de cardio con XP por día */
  maxCardioMin: 120,
  /** Minutos de movilidad/técnica con XP por día */
  maxMobilityMin: 60,
  /** Sesiones completadas con bonus por día */
  maxSessionsCompleted: 3,
} as const;

/** Niveles: XP_requerida(L) = 100 × L² para L ≥ 1 (umbral de L=0 es 0 XP) */
export const LEVEL_FORMULA = {
  base: 100,
  exponent: 2,
} as const;

/**
 * Pesos del Report Card diario: R = 0,45·T + 0,25·H + 0,20·C + 0,10·W
 * T = cumplimiento del objetivo de entrenamiento (0–100)
 * H = cumplimiento de hábitos saludables configurados (0–100)
 * C = consistencia con el plan personal (0–100)
 * W = recuperación y bienestar autodeclarados (0–100)
 */
export const REPORT_WEIGHTS = {
  training: 0.45,
  habits: 0.25,
  consistency: 0.2,
  wellbeing: 0.1,
} as const;

/** Rangos del Report Card. El rango se calcula con precisión completa; el redondeo a 1 decimal es solo presentación. */
export const REPORT_RANKS = [
  { rank: 'S', min: 95, max: 100 },
  { rank: 'A', min: 85, max: 95 },
  { rank: 'B', min: 70, max: 85 },
  { rank: 'C', min: 50, max: 70 },
  { rank: 'D', min: 0, max: 50 },
] as const;

export type ReportRank = (typeof REPORT_RANKS)[number]['rank'];

/** Recompensas cosméticas desbloqueables por nivel (diseño original) */
export const COSMETIC_REWARDS = [
  { id: 'aura-ember', name: 'Aura Brasas', description: 'Un resplandor cálido rodea tu HUD.', kind: 'aura', unlockLevel: 2 },
  { id: 'frame-iron', name: 'Marco de Hierro', description: 'Marco forjado para tu retrato de héroe.', kind: 'marco', unlockLevel: 3 },
  { id: 'title-spark', name: 'Título: Chispa', description: 'Tu nombre brilla con el título «Chispa».', kind: 'titulo', unlockLevel: 4 },
  { id: 'aura-storm', name: 'Aura Tormenta', description: 'Arcos violeta y cian envuelven tu HUD.', kind: 'aura', unlockLevel: 6 },
  { id: 'frame-mythril', name: 'Marco de Mitrilo', description: 'Marco legendario para tu retrato.', kind: 'marco', unlockLevel: 8 },
  { id: 'title-forge', name: 'Título: Forjado', description: 'El título «Forjado» arde junto a tu nombre.', kind: 'titulo', unlockLevel: 10 },
] as const;

/** Ritmo del motor narrativo: límites de coste */
export const STORY_LIMITS = {
  /** Generaciones IA por usuario y día */
  maxGenerationsPerDay: 10,
  /** Máximo de tokens de salida por escena */
  maxTokens: 600,
  /** Reintentos ante respuesta malformada */
  maxRetries: 2,
} as const;
