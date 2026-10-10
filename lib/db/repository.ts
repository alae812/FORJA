/**
 * FORJA — Interfaz de persistencia intercambiable.
 *
 * Toda la app habla con la base de datos a través de `DbRepository`.
 * - Desarrollo/demo: adaptador local (lib/db/local.ts) con archivos JSON.
 *   Documentado como NO apto para producción (sin cifrado, sin RLS).
 * - Producción: adaptador Supabase/PostgreSQL (lib/db/supabase.ts) con RLS.
 *
 * Ningún método expone datos de otro perfil: todos reciben `profileId`
 * y los adaptadores lo usan como filtro obligatorio (aislamiento).
 */
import type {
  AttributeKey,
  BodyProgressEntry,
  CharacterStats,
  DailyReport,
  HabitCheck,
  NutritionLog,
  PrivateMedia,
  Profile,
  SessionStatus,
  SleepLog,
  StoryArc,
  StoryScene,
  StoryState,
  TrainingSession,
  UserSettings,
  WellbeingLog,
  XpEvent,
} from '@/types';
import type { DayUsage } from '@/lib/gamification/xp';

export interface SessionFilters {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  status?: SessionStatus;
  limit?: number;
  offset?: number;
}

export interface XpEventFilters {
  from?: string; // ISO
  to?: string; // ISO
  sessionId?: string;
  limit?: number;
}

/** Resultado atómico de aplicar una sesión: sesión + eventos + stats */
export interface SessionApplyResult {
  session: TrainingSession;
  events: XpEvent[];
  stats: CharacterStats;
}

export interface DbRepository {
  // ---- perfiles ----
  getProfile(id: string): Promise<Profile | null>;
  getProfileByHeroName(heroName: string): Promise<Profile | null>;
  createProfile(input: { heroName: string; combatStyle?: Profile['combatStyle'] }): Promise<Profile>;
  updateProfile(
    id: string,
    patch: Partial<Pick<Profile, 'heroName' | 'onboardingDone' | 'dailyGoalXp' | 'combatStyle'>>,
  ): Promise<Profile>;

  // ---- personaje ----
  getStats(profileId: string): Promise<CharacterStats>;
  /** Guarda stats recalculadas (p. ej. bonus narrativos) */
  saveStats(stats: CharacterStats): Promise<CharacterStats>;

  // ---- sesiones ----
  listSessions(profileId: string, filters?: SessionFilters): Promise<TrainingSession[]>;
  getSession(profileId: string, id: string): Promise<TrainingSession | null>;
  getSessionByIdempotencyKey(profileId: string, key: string): Promise<TrainingSession | null>;
  /** Inserta o actualiza sesión + eventos de XP + stats de forma atómica */
  applySessionResult(result: SessionApplyResult): Promise<TrainingSession>;
  updateSession(
    profileId: string,
    id: string,
    patch: Partial<Pick<TrainingSession, 'status' | 'exercises' | 'date' | 'xpAwarded' | 'xpBreakdown'>>,
  ): Promise<TrainingSession | null>;

  // ---- eventos XP ----
  appendXpEvents(events: XpEvent[]): Promise<void>;
  listXpEvents(profileId: string, filters?: XpEventFilters): Promise<XpEvent[]>;

  /** Uso diario (límites) reconstruido desde sesiones no canceladas del día */
  getDayUsage(profileId: string, date: string): Promise<DayUsage>;
  /** XP de entrenamiento del día (eventos no revertidos) */
  getTrainingXpForDay(profileId: string, date: string): Promise<number>;
  dailyGoalAwarded(profileId: string, date: string): Promise<boolean>;

  // ---- sueño / nutrición / progreso ----
  upsertSleepLog(log: SleepLog): Promise<SleepLog>;
  getSleepLog(profileId: string, date: string): Promise<SleepLog | null>;
  listSleepLogs(profileId: string, from: string, to: string): Promise<SleepLog[]>;
  upsertWellbeingLog(log: WellbeingLog): Promise<WellbeingLog>;
  getWellbeingLog(profileId: string, date: string): Promise<WellbeingLog | null>;
  addNutritionLog(log: NutritionLog): Promise<NutritionLog>;
  listNutritionLogs(profileId: string, date: string): Promise<NutritionLog[]>;
  deleteNutritionLog(profileId: string, id: string): Promise<boolean>;
  addBodyProgress(entry: BodyProgressEntry): Promise<BodyProgressEntry>;
  listBodyProgress(profileId: string, limit?: number): Promise<BodyProgressEntry[]>;

  // ---- medios privados ----
  savePrivateMedia(media: PrivateMedia): Promise<PrivateMedia>;
  getPrivateMedia(profileId: string, id: string): Promise<PrivateMedia | null>;
  deletePrivateMedia(profileId: string, id: string): Promise<boolean>;

  // ---- historia ----
  listStoryArcs(): Promise<StoryArc[]>;
  getStoryState(profileId: string): Promise<StoryState>;
  updateStoryState(profileId: string, patch: Partial<StoryState>): Promise<StoryState>;
  saveStoryScene(scene: StoryScene): Promise<void>;
  getStoryScene(id: string): Promise<StoryScene | null>;
  listStoryScenes(arcId: string): Promise<StoryScene[]>;

  // ---- informes / hábitos / ajustes ----
  upsertDailyReport(report: DailyReport): Promise<DailyReport>;
  getDailyReport(profileId: string, date: string): Promise<DailyReport | null>;
  setHabitCheck(check: HabitCheck): Promise<void>;
  getHabitChecks(profileId: string, date: string): Promise<HabitCheck[]>;
  getSettings(profileId: string): Promise<UserSettings>;
  updateSettings(profileId: string, patch: Partial<UserSettings>): Promise<UserSettings>;

  // ---- privacidad ----
  /** Vuelca todos los datos del perfil (exportación) */
  exportProfileData(profileId: string): Promise<Record<string, unknown>>;
  /** Elimina todos los datos del perfil (derecho de supresión) */
  deleteProfileData(profileId: string): Promise<void>;
}

export type { AttributeKey };
