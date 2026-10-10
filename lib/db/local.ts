/**
 * FORJA — Adaptador de persistencia local (desarrollo / modo demo).
 *
 * Guarda todo en un único JSON (`data/forja-db.json`, configurable con
 * FORJA_DATA_DIR). Escritura atómica (tmp + rename) por operación.
 *
 * ⚠️ NO equivale a seguridad de producción: sin cifrado en reposo, sin RLS,
 * sin control de acceso a nivel de base de datos. La interfaz DbRepository
 * permite sustituirlo por el adaptador Supabase sin cambiar la app.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  BodyProgressEntry,
  CharacterStats,
  DailyReport,
  HabitCheck,
  NutritionLog,
  PrivateMedia,
  Profile,
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
import { EMPTY_USAGE } from '@/lib/gamification/xp';
import type {
  DbRepository,
  SessionApplyResult,
  SessionFilters,
  XpEventFilters,
} from './repository';

interface LocalTables {
  profiles: Profile[];
  stats: CharacterStats[];
  sessions: TrainingSession[];
  xpEvents: XpEvent[];
  sleepLogs: SleepLog[];
  nutritionLogs: NutritionLog[];
  bodyProgress: BodyProgressEntry[];
  privateMedia: PrivateMedia[];
  storyArcs: StoryArc[];
  storyScenes: StoryScene[];
  storyStates: StoryState[];
  dailyReports: DailyReport[];
  habitChecks: HabitCheck[];
  settings: UserSettings[];
  wellbeingLogs: WellbeingLog[];
}

const EMPTY_TABLES: LocalTables = {
  profiles: [],
  stats: [],
  sessions: [],
  xpEvents: [],
  sleepLogs: [],
  nutritionLogs: [],
  bodyProgress: [],
  privateMedia: [],
  storyArcs: [],
  storyScenes: [],
  storyStates: [],
  dailyReports: [],
  habitChecks: [],
  settings: [],
  wellbeingLogs: [],
};

const SEED_ARCS: StoryArc[] = [
  { id: 'llamada', title: 'La Llamada de la Forja', description: 'Naia, espíritu de la forja, te elige como aprendiz.', order: 1 },
  { id: 'primer-golpe', title: 'El Primer Golpe', description: 'Tu primera sesión enciende el yunque.', order: 2 },
  { id: 'ritmo', title: 'Ritmo de Guerra', description: 'La constancia convierte chispas en llamas.', order: 3 },
  { id: 'sombra', title: 'La Sombra del Yunque', description: 'Kade, tu rival, cuestiona tu disciplina.', order: 4 },
  { id: 'regreso', title: 'El Regreso', description: 'Volver tras un descanso también es victoria.', order: 5 },
];

const DEFAULT_HABITS = [
  { id: 'agua', label: 'Beber suficiente agua', enabled: true },
  { id: 'movilidad', label: '10 min de movilidad', enabled: true },
  { id: 'descanso', label: 'Acostarme a hora regular', enabled: true },
  { id: 'comida', label: 'Comida principal equilibrada', enabled: true },
];

function dataDir(): string {
  return process.env.FORJA_DATA_DIR ?? path.join(process.cwd(), 'data');
}
function dbFile(): string {
  return path.join(dataDir(), 'forja-db.json');
}
function mediaDir(): string {
  return process.env.FORJA_MEDIA_DIR ?? path.join(dataDir(), 'media');
}

const nowIso = (): string => new Date().toISOString();

export class LocalRepository implements DbRepository {
  private cache: LocalTables | null = null;
  private cacheMtimeMs = 0;

  /**
   * Carga con invalidación por mtime: en dev (Turbopack) las páginas y las
   * rutas API pueden evaluar este módulo en ámbitos distintos, cada uno con
   * su propio singleton. Sin invalidación, un ámbito no vería los cambios
   * escritos por el otro. La escritura es atómica (tmp + rename).
   */
  private async load(): Promise<LocalTables> {
    let mtimeMs = 0;
    try {
      mtimeMs = (await fs.stat(dbFile())).mtimeMs;
    } catch {
      mtimeMs = 0;
    }
    if (!this.cache || mtimeMs !== this.cacheMtimeMs) {
      try {
        const raw = await fs.readFile(dbFile(), 'utf8');
        const parsed = JSON.parse(raw) as Partial<LocalTables>;
        this.cache = { ...EMPTY_TABLES, ...parsed };
      } catch {
        this.cache = { ...EMPTY_TABLES, storyArcs: SEED_ARCS };
        await this.save();
        return this.cache;
      }
      this.cacheMtimeMs = mtimeMs;
    }
    if (this.cache.storyArcs.length === 0) this.cache.storyArcs = SEED_ARCS;
    return this.cache;
  }

  private async save(): Promise<void> {
    if (!this.cache) return;
    await fs.mkdir(dataDir(), { recursive: true });
    const tmp = `${dbFile()}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.cache), 'utf8');
    await fs.rename(tmp, dbFile());
    try {
      this.cacheMtimeMs = (await fs.stat(dbFile())).mtimeMs;
    } catch {
      // si no se puede leer el mtime, la próxima carga revalidará por seguridad
      this.cacheMtimeMs = 0;
    }
  }

  // ---- perfiles ----
  async getProfile(id: string): Promise<Profile | null> {
    const db = await this.load();
    return db.profiles.find((p) => p.id === id) ?? null;
  }

  async getProfileByHeroName(heroName: string): Promise<Profile | null> {
    const db = await this.load();
    return (
      db.profiles.find((p) => p.heroName.toLowerCase() === heroName.toLowerCase()) ?? null
    );
  }

  async createProfile(input: { heroName: string; combatStyle?: Profile['combatStyle'] }): Promise<Profile> {
    const db = await this.load();
    const profile: Profile = {
      id: randomUUID(),
      heroName: input.heroName,
      createdAt: nowIso(),
      onboardingDone: false,
      dailyGoalXp: 30,
      combatStyle: input.combatStyle,
    };
    db.profiles.push(profile);
    db.stats.push({
      profileId: profile.id,
      totalXp: 0,
      xpStr: 0,
      xpSta: 0,
      xpWis: 0,
      level: 0,
      updatedAt: nowIso(),
    });
    db.settings.push({
      profileId: profile.id,
      dailyGoalXp: 30,
      habits: DEFAULT_HABITS,
      plannedRestDays: [0],
      effectsEnabled: true,
      reduceMotion: false,
      updatedAt: nowIso(),
    });
    db.storyStates.push({
      profileId: profile.id,
      flags: {},
      unlockedArcs: ['llamada'],
      unlockedCosmetics: [],
      seenSceneIds: [],
      choiceHistory: [],
      updatedAt: nowIso(),
    });
    await this.save();
    return profile;
  }

  async updateProfile(
    id: string,
    patch: Partial<Pick<Profile, 'heroName' | 'onboardingDone' | 'dailyGoalXp' | 'combatStyle'>>,
  ): Promise<Profile> {
    const db = await this.load();
    const profile = db.profiles.find((p) => p.id === id);
    if (!profile) throw new Error('Perfil no encontrado');
    Object.assign(profile, patch);
    if (patch.dailyGoalXp != null) {
      const settings = db.settings.find((s) => s.profileId === id);
      if (settings) {
        settings.dailyGoalXp = patch.dailyGoalXp;
        settings.updatedAt = nowIso();
      }
    }
    await this.save();
    return profile;
  }

  // ---- personaje ----
  async getStats(profileId: string): Promise<CharacterStats> {
    const db = await this.load();
    let stats = db.stats.find((s) => s.profileId === profileId);
    if (!stats) {
      stats = {
        profileId,
        totalXp: 0,
        xpStr: 0,
        xpSta: 0,
        xpWis: 0,
        level: 0,
        updatedAt: nowIso(),
      };
      db.stats.push(stats);
      await this.save();
    }
    return stats;
  }

  async saveStats(stats: CharacterStats): Promise<CharacterStats> {
    const db = await this.load();
    const next = { ...stats, updatedAt: nowIso() };
    const idx = db.stats.findIndex((s) => s.profileId === stats.profileId);
    if (idx >= 0) db.stats[idx] = next;
    else db.stats.push(next);
    await this.save();
    return next;
  }

  // ---- sesiones ----
  async listSessions(profileId: string, filters: SessionFilters = {}): Promise<TrainingSession[]> {
    const db = await this.load();
    let list = db.sessions.filter((s) => s.profileId === profileId);
    if (filters.from) list = list.filter((s) => s.date >= filters.from!);
    if (filters.to) list = list.filter((s) => s.date <= filters.to!);
    if (filters.status) list = list.filter((s) => s.status === filters.status);
    list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)));
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 100;
    return list.slice(offset, offset + limit);
  }

  async getSession(profileId: string, id: string): Promise<TrainingSession | null> {
    const db = await this.load();
    return db.sessions.find((s) => s.profileId === profileId && s.id === id) ?? null;
  }

  async getSessionByIdempotencyKey(profileId: string, key: string): Promise<TrainingSession | null> {
    const db = await this.load();
    return db.sessions.find((s) => s.profileId === profileId && s.idempotencyKey === key) ?? null;
  }

  async applySessionResult(result: SessionApplyResult): Promise<TrainingSession> {
    const db = await this.load();
    const idx = db.sessions.findIndex(
      (s) => s.profileId === result.session.profileId && s.id === result.session.id,
    );
    if (idx >= 0) db.sessions[idx] = result.session;
    else db.sessions.push(result.session);
    db.xpEvents.push(...result.events);
    const sIdx = db.stats.findIndex((s) => s.profileId === result.stats.profileId);
    if (sIdx >= 0) db.stats[sIdx] = result.stats;
    else db.stats.push(result.stats);
    await this.save();
    return result.session;
  }

  async updateSession(
    profileId: string,
    id: string,
    patch: Partial<Pick<TrainingSession, 'status' | 'exercises' | 'date' | 'xpAwarded' | 'xpBreakdown'>>,
  ): Promise<TrainingSession | null> {
    const db = await this.load();
    const session = db.sessions.find((s) => s.profileId === profileId && s.id === id);
    if (!session) return null;
    Object.assign(session, patch, { updatedAt: nowIso() });
    await this.save();
    return session;
  }

  // ---- eventos XP ----
  async appendXpEvents(events: XpEvent[]): Promise<void> {
    const db = await this.load();
    db.xpEvents.push(...events);
    await this.save();
  }

  async listXpEvents(profileId: string, filters: XpEventFilters = {}): Promise<XpEvent[]> {
    const db = await this.load();
    let list = db.xpEvents.filter((e) => e.profileId === profileId);
    if (filters.from) list = list.filter((e) => e.createdAt >= filters.from!);
    if (filters.to) list = list.filter((e) => e.createdAt <= filters.to!);
    if (filters.sessionId) list = list.filter((e) => e.sessionId === filters.sessionId);
    list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : 1));
    const limit = filters.limit ?? 500;
    return list.slice(0, limit);
  }

  async getDayUsage(profileId: string, date: string): Promise<DayUsage> {
    const db = await this.load();
    const usage: DayUsage = { ...EMPTY_USAGE };
    for (const s of db.sessions) {
      if (s.profileId !== profileId || s.date !== date || s.status === 'cancelled') continue;
      for (const item of s.xpBreakdown) {
        const u = item.units ?? 0;
        if (item.kind === 'set') usage.sets += u;
        else if (item.kind === 'set_bonus') usage.setBonuses += u;
        else if (item.kind === 'cardio') usage.cardioMin += u;
        else if (item.kind === 'mobility') usage.mobilityMin += u;
        else if (item.kind === 'session_complete') usage.sessionsCompleted += u;
      }
    }
    return usage;
  }

  async getTrainingXpForDay(profileId: string, date: string): Promise<number> {
    const db = await this.load();
    // La XP de entrenamiento excluye bonus narrativos (no cuentan para el objetivo diario)
    const TRAINING_KINDS = new Set([
      'set',
      'set_bonus',
      'cardio',
      'mobility',
      'session_complete',
      'daily_goal',
      'reversal',
    ]);
    let total = 0;
    for (const e of db.xpEvents) {
      if (e.profileId !== profileId) continue;
      if (e.createdAt.slice(0, 10) !== date) continue;
      if (!TRAINING_KINDS.has(e.kind)) continue;
      total += e.xp;
    }
    return Math.round(total * 10) / 10;
  }

  async dailyGoalAwarded(profileId: string, date: string): Promise<boolean> {
    const db = await this.load();
    return db.xpEvents.some(
      (e) =>
        e.profileId === profileId &&
        e.kind === 'daily_goal' &&
        e.createdAt.slice(0, 10) === date,
    );
  }

  // ---- sueño / nutrición / progreso ----
  async upsertSleepLog(log: SleepLog): Promise<SleepLog> {
    const db = await this.load();
    const idx = db.sleepLogs.findIndex(
      (l) => l.profileId === log.profileId && l.date === log.date,
    );
    if (idx >= 0) db.sleepLogs[idx] = log;
    else db.sleepLogs.push(log);
    await this.save();
    return log;
  }

  async getSleepLog(profileId: string, date: string): Promise<SleepLog | null> {
    const db = await this.load();
    return db.sleepLogs.find((l) => l.profileId === profileId && l.date === date) ?? null;
  }

  async listSleepLogs(profileId: string, from: string, to: string): Promise<SleepLog[]> {
    const db = await this.load();
    return db.sleepLogs
      .filter((l) => l.profileId === profileId && l.date >= from && l.date <= to)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  async upsertWellbeingLog(log: WellbeingLog): Promise<WellbeingLog> {
    const db = await this.load();
    const idx = db.wellbeingLogs.findIndex(
      (l) => l.profileId === log.profileId && l.date === log.date,
    );
    if (idx >= 0) db.wellbeingLogs[idx] = log;
    else db.wellbeingLogs.push(log);
    await this.save();
    return log;
  }

  async getWellbeingLog(profileId: string, date: string): Promise<WellbeingLog | null> {
    const db = await this.load();
    return db.wellbeingLogs.find((l) => l.profileId === profileId && l.date === date) ?? null;
  }

  async addNutritionLog(log: NutritionLog): Promise<NutritionLog> {
    const db = await this.load();
    db.nutritionLogs.push(log);
    await this.save();
    return log;
  }

  async listNutritionLogs(profileId: string, date: string): Promise<NutritionLog[]> {
    const db = await this.load();
    return db.nutritionLogs
      .filter((l) => l.profileId === profileId && l.date === date)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  async deleteNutritionLog(profileId: string, id: string): Promise<boolean> {
    const db = await this.load();
    const idx = db.nutritionLogs.findIndex((l) => l.profileId === profileId && l.id === id);
    if (idx < 0) return false;
    db.nutritionLogs.splice(idx, 1);
    await this.save();
    return true;
  }

  async addBodyProgress(entry: BodyProgressEntry): Promise<BodyProgressEntry> {
    const db = await this.load();
    db.bodyProgress.push(entry);
    await this.save();
    return entry;
  }

  async listBodyProgress(profileId: string, limit = 60): Promise<BodyProgressEntry[]> {
    const db = await this.load();
    return db.bodyProgress
      .filter((e) => e.profileId === profileId)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, limit);
  }

  // ---- medios privados ----
  async savePrivateMedia(media: PrivateMedia): Promise<PrivateMedia> {
    const db = await this.load();
    db.privateMedia.push(media);
    await this.save();
    return media;
  }

  async getPrivateMedia(profileId: string, id: string): Promise<PrivateMedia | null> {
    const db = await this.load();
    return db.privateMedia.find((m) => m.profileId === profileId && m.id === id) ?? null;
  }

  async deletePrivateMedia(profileId: string, id: string): Promise<boolean> {
    const db = await this.load();
    const idx = db.privateMedia.findIndex((m) => m.profileId === profileId && m.id === id);
    if (idx < 0) return false;
    db.privateMedia.splice(idx, 1);
    await this.save();
    try {
      await fs.rm(path.join(mediaDir(), `${id}`), { recursive: true, force: true });
    } catch {
      // el registro ya se eliminó; el archivo es secundario
    }
    return true;
  }

  // ---- historia ----
  async listStoryArcs(): Promise<StoryArc[]> {
    const db = await this.load();
    return [...db.storyArcs].sort((a, b) => a.order - b.order);
  }

  async getStoryState(profileId: string): Promise<StoryState> {
    const db = await this.load();
    let state = db.storyStates.find((s) => s.profileId === profileId);
    if (!state) {
      state = {
        profileId,
        flags: {},
        unlockedArcs: ['llamada'],
        unlockedCosmetics: [],
        seenSceneIds: [],
        choiceHistory: [],
        updatedAt: nowIso(),
      };
      db.storyStates.push(state);
      await this.save();
    }
    return state;
  }

  async updateStoryState(profileId: string, patch: Partial<StoryState>): Promise<StoryState> {
    const db = await this.load();
    let state = db.storyStates.find((s) => s.profileId === profileId);
    if (!state) {
      state = {
        profileId,
        flags: {},
        unlockedArcs: ['llamada'],
        unlockedCosmetics: [],
        seenSceneIds: [],
        choiceHistory: [],
        updatedAt: nowIso(),
      };
      db.storyStates.push(state);
    }
    Object.assign(state, patch, { profileId, updatedAt: nowIso() });
    await this.save();
    return state;
  }

  async saveStoryScene(scene: StoryScene): Promise<void> {
    const db = await this.load();
    const idx = db.storyScenes.findIndex((s) => s.id === scene.id);
    if (idx >= 0) db.storyScenes[idx] = scene;
    else db.storyScenes.push(scene);
    await this.save();
  }

  async getStoryScene(id: string): Promise<StoryScene | null> {
    const db = await this.load();
    return db.storyScenes.find((s) => s.id === id) ?? null;
  }

  async listStoryScenes(arcId: string): Promise<StoryScene[]> {
    const db = await this.load();
    return db.storyScenes.filter((s) => s.arcId === arcId);
  }

  // ---- informes / hábitos / ajustes ----
  async upsertDailyReport(report: DailyReport): Promise<DailyReport> {
    const db = await this.load();
    const idx = db.dailyReports.findIndex(
      (r) => r.profileId === report.profileId && r.date === report.date,
    );
    if (idx >= 0) db.dailyReports[idx] = report;
    else db.dailyReports.push(report);
    await this.save();
    return report;
  }

  async getDailyReport(profileId: string, date: string): Promise<DailyReport | null> {
    const db = await this.load();
    return (
      db.dailyReports.find((r) => r.profileId === profileId && r.date === date) ?? null
    );
  }

  async setHabitCheck(check: HabitCheck): Promise<void> {
    const db = await this.load();
    const idx = db.habitChecks.findIndex(
      (c) => c.profileId === check.profileId && c.date === check.date && c.habitId === check.habitId,
    );
    if (idx >= 0) db.habitChecks[idx] = check;
    else db.habitChecks.push(check);
    await this.save();
  }

  async getHabitChecks(profileId: string, date: string): Promise<HabitCheck[]> {
    const db = await this.load();
    return db.habitChecks.filter((c) => c.profileId === profileId && c.date === date);
  }

  async getSettings(profileId: string): Promise<UserSettings> {
    const db = await this.load();
    let settings = db.settings.find((s) => s.profileId === profileId);
    if (!settings) {
      settings = {
        profileId,
        dailyGoalXp: 30,
        habits: DEFAULT_HABITS,
        plannedRestDays: [0],
        effectsEnabled: true,
        reduceMotion: false,
        updatedAt: nowIso(),
      };
      db.settings.push(settings);
      await this.save();
    }
    return settings;
  }

  async updateSettings(profileId: string, patch: Partial<UserSettings>): Promise<UserSettings> {
    const settings = await this.getSettings(profileId);
    const db = await this.load();
    Object.assign(settings, patch, { profileId, updatedAt: nowIso() });
    const idx = db.settings.findIndex((s) => s.profileId === profileId);
    if (idx >= 0) db.settings[idx] = settings;
    await this.save();
    return settings;
  }

  // ---- privacidad ----
  async exportProfileData(profileId: string): Promise<Record<string, unknown>> {
    const db = await this.load();
    const pick = <T extends { profileId: string }>(rows: T[]): T[] =>
      rows.filter((r) => r.profileId === profileId);
    return {
      exportedAt: nowIso(),
      app: 'FORJA',
      profile: db.profiles.find((p) => p.id === profileId) ?? null,
      stats: db.stats.find((s) => s.profileId === profileId) ?? null,
      sessions: pick(db.sessions),
      xpEvents: pick(db.xpEvents),
      sleepLogs: pick(db.sleepLogs),
      wellbeingLogs: pick(db.wellbeingLogs),
      nutritionLogs: pick(db.nutritionLogs),
      bodyProgress: pick(db.bodyProgress),
      privateMedia: pick(db.privateMedia).map((m) => ({ ...m })),
      storyScenes: db.storyScenes,
      storyState: db.storyStates.find((s) => s.profileId === profileId) ?? null,
      dailyReports: pick(db.dailyReports),
      habitChecks: pick(db.habitChecks),
      settings: db.settings.find((s) => s.profileId === profileId) ?? null,
    };
  }

  async deleteProfileData(profileId: string): Promise<void> {
    const db = await this.load();
    const drop = <T extends { profileId: string }>(rows: T[]): T[] =>
      rows.filter((r) => r.profileId !== profileId);
    db.profiles = db.profiles.filter((p) => p.id !== profileId);
    db.stats = drop(db.stats);
    db.sessions = drop(db.sessions);
    db.xpEvents = drop(db.xpEvents);
    db.sleepLogs = drop(db.sleepLogs);
    db.wellbeingLogs = drop(db.wellbeingLogs);
    db.nutritionLogs = drop(db.nutritionLogs);
    db.bodyProgress = drop(db.bodyProgress);
    db.privateMedia = drop(db.privateMedia);
    db.storyStates = drop(db.storyStates);
    db.dailyReports = drop(db.dailyReports);
    db.habitChecks = drop(db.habitChecks);
    db.settings = drop(db.settings);
    // Las escenas generadas por IA son contenido; se conservan anonimizadas.
    await this.save();
    try {
      await fs.rm(mediaDir(), { recursive: true, force: true });
    } catch {
      // sin medios que borrar
    }
  }
}

let instance: LocalRepository | null = null;
/** Instancia compartida del adaptador local */
export function localRepository(): LocalRepository {
  if (!instance) instance = new LocalRepository();
  return instance;
}

export { mediaDir, dataDir };
