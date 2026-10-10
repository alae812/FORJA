/**
 * FORJA — Tipos de dominio.
 * Diseño original. Toda la lógica de negocio opera sobre estos tipos.
 */

/** Atributos RPG principales */
export type AttributeKey = 'str' | 'sta' | 'wis';

export const ATTRIBUTES: Record<AttributeKey, { name: string; short: string; description: string }> = {
  str: {
    name: 'Fuerza',
    short: 'STR',
    description: 'Resistencia, máquinas, mancuernas, barras y peso corporal.',
  },
  sta: {
    name: 'Estamina',
    short: 'STA',
    description: 'Carrera, bicicleta, caminata, circuitos y cardio.',
  },
  wis: {
    name: 'Sabiduría',
    short: 'WIS',
    description: 'Técnica, movilidad, reflexión y constancia en hábitos de recuperación.',
  },
};

/** Perfil del héroe (usuario) */
export interface Profile {
  id: string;
  heroName: string;
  createdAt: string; // ISO
  onboardingDone: boolean;
  /** Objetivo diario de XP configurable (por defecto 30) */
  dailyGoalXp: number;
  /** Estilo de combate elegido en el onboarding (cosmético/narrativo) */
  combatStyle?: 'guardian' | 'cazador' | 'sabio';
}

/** Estadísticas del personaje */
export interface CharacterStats {
  profileId: string;
  totalXp: number;
  xpStr: number;
  xpSta: number;
  xpWis: number;
  level: number;
  updatedAt: string; // ISO
}

export type ExerciseCategory =
  | 'strength'
  | 'bodyweight'
  | 'cardio'
  | 'mobility'
  | 'technique';

export const EXERCISE_CATEGORIES: Record<
  ExerciseCategory,
  { name: string; attribute: AttributeKey; unit: string }
> = {
  strength: { name: 'Fuerza / máquinas', attribute: 'str', unit: 'series' },
  bodyweight: { name: 'Peso corporal', attribute: 'str', unit: 'series' },
  cardio: { name: 'Cardio', attribute: 'sta', unit: 'minutos' },
  mobility: { name: 'Movilidad', attribute: 'wis', unit: 'minutos' },
  technique: { name: 'Técnica', attribute: 'wis', unit: 'minutos' },
};

export interface ExerciseEntry {
  id: string;
  name: string;
  category: ExerciseCategory;
  attribute: AttributeKey;
  sets?: number;
  reps?: number;
  loadKg?: number;
  durationMin?: number;
  /** true si cumplió el objetivo previsto de la serie (bonus +2 XP/serie) */
  targetMet?: boolean;
  notes?: string;
}

export type SessionStatus = 'planned' | 'completed' | 'cancelled';

export interface XpBreakdownItem {
  kind: 'set' | 'set_bonus' | 'cardio' | 'mobility' | 'session_complete' | 'daily_goal';
  attribute: AttributeKey;
  xp: number;
  detail: string;
  /** Unidades que generaron la XP (series o minutos), para auditoría y límites */
  units?: number;
}

export interface TrainingSession {
  id: string;
  profileId: string;
  /** Clave de idempotencia generada por el cliente */
  idempotencyKey: string;
  /** Fecha planificada/realizada (YYYY-MM-DD) */
  date: string;
  status: SessionStatus;
  exercises: ExerciseEntry[];
  xpAwarded: number;
  xpBreakdown: XpBreakdownItem[];
  isRestDay?: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** Libro mayor auditable de XP. Las reversiones son eventos negativos, nunca borrado. */
export interface XpEvent {
  id: string;
  profileId: string;
  sessionId?: string;
  kind:
    | 'set'
    | 'set_bonus'
    | 'cardio'
    | 'mobility'
    | 'session_complete'
    | 'daily_goal'
    | 'story_bonus'
    | 'reversal';
  attribute: AttributeKey | null;
  /** Puede ser negativo en reversiones */
  xp: number;
  meta: Record<string, unknown>;
  createdAt: string; // ISO
}

/** Hábitos saludables configurables (cuentan para H del Report Card) */
export interface Habit {
  id: string;
  label: string;
  enabled: boolean;
}

export interface SleepLog {
  id: string;
  profileId: string;
  date: string; // YYYY-MM-DD (día al que se asigna)
  bedTime: string; // "23:30"
  wakeTime: string; // "07:15"
  durationMin: number; // calculado
  quality: 1 | 2 | 3 | 4 | 5; // percibida
  notes?: string;
  createdAt: string;
}

export interface NutritionLog {
  id: string;
  profileId: string;
  date: string; // YYYY-MM-DD
  meal: 'desayuno' | 'comida' | 'merienda' | 'cena' | 'snack';
  description: string;
  waterMl?: number;
  /** Siempre estimaciones salvo integración nutricional real documentada */
  isEstimate: true;
  createdAt: string;
}

export interface BodyProgressEntry {
  id: string;
  profileId: string;
  date: string;
  weightKg?: number;
  notes?: string;
  /** id del medio privado asociado, si existe */
  mediaId?: string;
  createdAt: string;
}

/** Medio privado (foto de análisis visual). Nunca público. */
export interface PrivateMedia {
  id: string;
  profileId: string;
  kind: 'body_analysis';
  mimeType: string;
  sizeBytes: number;
  /** Consentimiento explícito registrado */
  consentAt: string; // ISO
  consentPurpose: string;
  createdAt: string;
}

export interface StoryChoice {
  id: string;
  label: string;
  nextSceneId?: string;
  effect?: {
    flag?: string;
    xpBonus?: number;
    unlockCosmetic?: string;
  };
}

export interface StoryScene {
  id: string;
  arcId: string;
  title: string;
  narration: string;
  backgroundKey: BackgroundKey;
  characterKey?: CharacterKey;
  choices: StoryChoice[];
  triggerEvent: StoryTriggerEvent;
  /** false = escena de reserva original (sin IA) */
  aiGenerated: boolean;
  createdAt: string;
}

export type StoryTriggerEvent =
  | 'onboarding_complete'
  | 'first_session'
  | 'streak_3'
  | 'personal_best'
  | 'return_after_rest'
  | 'level_up'
  | 'weekly_goal'
  | 'manual';

export type BackgroundKey =
  | 'forge'
  | 'dojo'
  | 'rooftop'
  | 'track'
  | 'library'
  | 'arena';

export type CharacterKey = 'naia' | 'rook' | 'mira' | 'temo' | 'kade';

export interface StoryState {
  profileId: string;
  currentSceneId?: string;
  /** flags persistentes que influyen en escenas futuras */
  flags: Record<string, string | number | boolean>;
  unlockedArcs: string[];
  unlockedCosmetics: string[];
  seenSceneIds: string[];
  choiceHistory: { sceneId: string; choiceId: string; at: string }[];
  updatedAt: string;
}

export interface CosmeticReward {
  id: string;
  name: string;
  description: string;
  kind: 'aura' | 'marco' | 'titulo';
  unlockLevel: number;
  unlockedAt?: string;
}

export interface DailyReport {
  id: string;
  profileId: string;
  date: string; // YYYY-MM-DD
  score: number | null; // null = evaluación incompleta
  rank: 'S' | 'A' | 'B' | 'C' | 'D' | null;
  components: {
    training: number | null;
    habits: number | null;
    consistency: number | null;
    wellbeing: number | null;
  };
  missing: string[];
  xpEarned: number;
  sessionsCompleted: number;
  isRestDay: boolean;
  recommendation: string;
  createdAt: string;
}

export interface HabitCheck {
  profileId: string;
  date: string; // YYYY-MM-DD
  habitId: string;
  done: boolean;
}

/** Bienestar autodeclarado (energía 1–5). Alimenta W del Report Card. */
export interface WellbeingLog {
  id: string;
  profileId: string;
  date: string; // YYYY-MM-DD
  energy: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  createdAt: string;
}

export interface StoryArc {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface UserSettings {
  profileId: string;
  dailyGoalXp: number;
  habits: Habit[];
  plannedRestDays: number[]; // 0=domingo..6=sábado
  effectsEnabled: boolean;
  reduceMotion: boolean;
  updatedAt: string;
}
