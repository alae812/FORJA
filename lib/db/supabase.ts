/**
 * FORJA — Adaptador Supabase/PostgreSQL.
 * Se activa cuando existen SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 *
 * Implementa la misma interfaz DbRepository que el adaptador local.
 * Todas las consultas filtran por profile_id (aislamiento a nivel de código);
 * las políticas RLS de la migración 001 añaden defensa en profundidad cuando
 * se accede con el JWT del usuario (@supabase/ssr).
 *
 * Variables de entorno (solo servidor, nunca exponer al cliente):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase no configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

/* ---------- mapeos camelCase <-> snake_case ---------- */

const snake = (s: string): string => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
function toSnake(obj: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[snake(k)] = v;
  return out;
}
function toCamel<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
  }
  return out as T;
}

async function must<T>(promise: Promise<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

const nowIso = (): string => new Date().toISOString();

class SupabaseRepository implements DbRepository {
  // ---- perfiles ----
  async getProfile(id: string): Promise<Profile | null> {
    const rows = await must(
      getClient().from('profiles').select('*').eq('id', id).limit(1) as never,
    ) as Record<string, unknown>[];
    return rows[0] ? toCamel<Profile>(rows[0]) : null;
  }

  async getProfileByHeroName(heroName: string): Promise<Profile | null> {
    const rows = (await must(
      getClient().from('profiles').select('*').ilike('hero_name', heroName).limit(1) as never,
    )) as Record<string, unknown>[];
    return rows[0] ? toCamel<Profile>(rows[0]) : null;
  }

  async createProfile(input: { heroName: string; combatStyle?: Profile['combatStyle'] }): Promise<Profile> {
    const id = randomUUID();
    const rows = (await must(
      getClient()
        .from('profiles')
        .insert(toSnake({ id, heroName: input.heroName, combatStyle: input.combatStyle ?? null }))
        .select()
        .limit(1) as never,
    )) as Record<string, unknown>[];
    const profile = toCamel<Profile>(rows[0]);
    await getClient().from('character_stats').insert({ profile_id: id });
    await getClient().from('user_settings').insert({ profile_id: id });
    await getClient().from('story_state').insert({ profile_id: id });
    return profile;
  }

  async updateProfile(
    id: string,
    patch: Partial<Pick<Profile, 'heroName' | 'onboardingDone' | 'dailyGoalXp' | 'combatStyle'>>,
  ): Promise<Profile> {
    const rows = (await must(
      getClient().from('profiles').update(toSnake(patch)).eq('id', id).select().limit(1) as never,
    )) as Record<string, unknown>[];
    if (!rows[0]) throw new Error('Perfil no encontrado');
    if (patch.dailyGoalXp != null) {
      await getClient()
        .from('user_settings')
        .update({ daily_goal_xp: patch.dailyGoalXp, updated_at: nowIso() })
        .eq('profile_id', id);
    }
    return toCamel<Profile>(rows[0]);
  }

  // ---- personaje ----
  async getStats(profileId: string): Promise<CharacterStats> {
    const rows = (await must(
      getClient().from('character_stats').select('*').eq('profile_id', profileId).limit(1) as never,
    )) as Record<string, unknown>[];
    if (!rows[0]) {
      const ins = (await must(
        getClient().from('character_stats').insert({ profile_id: profileId }).select().limit(1) as never,
      )) as Record<string, unknown>[];
      return toCamel<CharacterStats>(ins[0]);
    }
    return toCamel<CharacterStats>(rows[0]);
  }

  async saveStats(stats: CharacterStats): Promise<CharacterStats> {
    const rows = (await must(
      getClient()
        .from('character_stats')
        .upsert({ ...toSnake(stats), updated_at: nowIso() }, { onConflict: 'profile_id' })
        .select()
        .limit(1) as never,
    )) as Record<string, unknown>[];
    return toCamel<CharacterStats>(rows[0]);
  }

  // ---- sesiones ----
  async listSessions(profileId: string, filters: SessionFilters = {}): Promise<TrainingSession[]> {
    let q = getClient()
      .from('training_sessions')
      .select('*')
      .eq('profile_id', profileId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (filters.from) q = q.gte('date', filters.from);
    if (filters.to) q = q.lte('date', filters.to);
    if (filters.status) q = q.eq('status', filters.status);
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;
    q = q.range(offset, offset + limit - 1);
    const rows = (await must(q as never)) as Record<string, unknown>[];
    return rows.map((r) => toCamel<TrainingSession>(r));
  }

  async getSession(profileId: string, id: string): Promise<TrainingSession | null> {
    const rows = (await must(
      getClient().from('training_sessions').select('*').eq('profile_id', profileId).eq('id', id).limit(1) as never,
    )) as Record<string, unknown>[];
    return rows[0] ? toCamel<TrainingSession>(rows[0]) : null;
  }

  async getSessionByIdempotencyKey(profileId: string, key: string): Promise<TrainingSession | null> {
    const rows = (await must(
      getClient()
        .from('training_sessions')
        .select('*')
        .eq('profile_id', profileId)
        .eq('idempotency_key', key)
        .limit(1) as never,
    )) as Record<string, unknown>[];
    return rows[0] ? toCamel<TrainingSession>(rows[0]) : null;
  }

  async applySessionResult(result: SessionApplyResult): Promise<TrainingSession> {
    const s = result.session;
    const payload = {
      p_session: toSnake({
        id: s.id,
        profileId: s.profileId,
        idempotencyKey: s.idempotencyKey,
        date: s.date,
        status: s.status,
        exercises: s.exercises,
        xpAwarded: s.xpAwarded,
        xpBreakdown: s.xpBreakdown,
        isRestDay: s.isRestDay ?? false,
      }),
      p_events: result.events.map((e) =>
        toSnake({ id: e.id, sessionId: e.sessionId ?? '', kind: e.kind, attribute: e.attribute, xp: e.xp, meta: e.meta }),
      ),
      p_stats: toSnake({
        totalXp: result.stats.totalXp,
        xpStr: result.stats.xpStr,
        xpSta: result.stats.xpSta,
        xpWis: result.stats.xpWis,
        level: result.stats.level,
      }),
    };
    const { error } = await getClient().rpc('apply_session_result', payload);
    if (error) throw error;
    return s;
  }

  async updateSession(
    profileId: string,
    id: string,
    patch: Partial<Pick<TrainingSession, 'status' | 'exercises' | 'date' | 'xpAwarded' | 'xpBreakdown'>>,
  ): Promise<TrainingSession | null> {
    const rows = (await must(
      getClient()
        .from('training_sessions')
        .update({ ...toSnake(patch), updated_at: nowIso() })
        .eq('profile_id', profileId)
        .eq('id', id)
        .select()
        .limit(1) as never,
    )) as Record<string, unknown>[];
    return rows[0] ? toCamel<TrainingSession>(rows[0]) : null;
  }

  // ---- eventos XP ----
  async appendXpEvents(events: XpEvent[]): Promise<void> {
    if (events.length === 0) return;
    const { error } = await getClient()
      .from('xp_events')
      .insert(
        events.map((e) => toSnake({ id: e.id, profileId: e.profileId, sessionId: e.sessionId ?? null, kind: e.kind, attribute: e.attribute, xp: e.xp, meta: e.meta, createdAt: e.createdAt })),
      );
    if (error) throw error;
  }

  async listXpEvents(profileId: string, filters: XpEventFilters = {}): Promise<XpEvent[]> {
    let q = getClient().from('xp_events').select('*').eq('profile_id', profileId).order('created_at', { ascending: false });
    if (filters.from) q = q.gte('created_at', filters.from);
    if (filters.to) q = q.lte('created_at', filters.to);
    if (filters.sessionId) q = q.eq('session_id', filters.sessionId);
    q = q.limit(filters.limit ?? 500);
    const rows = (await must(q as never)) as Record<string, unknown>[];
    return rows.map((r) => toCamel<XpEvent>(r));
  }

  async getDayUsage(profileId: string, date: string): Promise<DayUsage> {
    const sessions = await this.listSessions(profileId, { from: date, to: date, limit: 100 });
    const usage: DayUsage = { ...EMPTY_USAGE };
    for (const s of sessions) {
      if (s.status === 'cancelled') continue;
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
    // La XP de entrenamiento excluye bonus narrativos (no cuentan para el objetivo diario)
    const { data, error } = await getClient()
      .from('xp_events')
      .select('xp, created_at')
      .eq('profile_id', profileId)
      .in('kind', ['set', 'set_bonus', 'cardio', 'mobility', 'session_complete', 'daily_goal', 'reversal'])
      .gte('created_at', `${date}T00:00:00`)
      .lt('created_at', `${date}T23:59:59.999`);
    if (error) throw error;
    const total = (data as { xp: number }[]).reduce((sum, r) => sum + r.xp, 0);
    return Math.round(total * 10) / 10;
  }

  async dailyGoalAwarded(profileId: string, date: string): Promise<boolean> {
    const { count, error } = await getClient()
      .from('xp_events')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('kind', 'daily_goal')
      .gte('created_at', `${date}T00:00:00`)
      .lt('created_at', `${date}T23:59:59.999`);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  // ---- sueño / nutrición / progreso ----
  async upsertSleepLog(log: SleepLog): Promise<SleepLog> {
    const rows = (await must(
      getClient()
        .from('sleep_logs')
        .upsert(toSnake(log), { onConflict: 'profile_id,date' })
        .select()
        .limit(1) as never,
    )) as Record<string, unknown>[];
    return toCamel<SleepLog>(rows[0]);
  }

  async getSleepLog(profileId: string, date: string): Promise<SleepLog | null> {
    const rows = (await must(
      getClient().from('sleep_logs').select('*').eq('profile_id', profileId).eq('date', date).limit(1) as never,
    )) as Record<string, unknown>[];
    return rows[0] ? toCamel<SleepLog>(rows[0]) : null;
  }

  async listSleepLogs(profileId: string, from: string, to: string): Promise<SleepLog[]> {
    const rows = (await must(
      getClient()
        .from('sleep_logs')
        .select('*')
        .eq('profile_id', profileId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true }) as never,
    )) as Record<string, unknown>[];
    return rows.map((r) => toCamel<SleepLog>(r));
  }

  async upsertWellbeingLog(log: WellbeingLog): Promise<WellbeingLog> {
    const rows = (await must(
      getClient()
        .from('wellbeing_logs')
        .upsert(toSnake(log), { onConflict: 'profile_id,date' })
        .select()
        .limit(1) as never,
    )) as Record<string, unknown>[];
    return toCamel<WellbeingLog>(rows[0]);
  }

  async getWellbeingLog(profileId: string, date: string): Promise<WellbeingLog | null> {
    const rows = (await must(
      getClient().from('wellbeing_logs').select('*').eq('profile_id', profileId).eq('date', date).limit(1) as never,
    )) as Record<string, unknown>[];
    return rows[0] ? toCamel<WellbeingLog>(rows[0]) : null;
  }

  async addNutritionLog(log: NutritionLog): Promise<NutritionLog> {
    const rows = (await must(
      getClient().from('nutrition_logs').insert(toSnake(log)).select().limit(1) as never,
    )) as Record<string, unknown>[];
    return toCamel<NutritionLog>(rows[0]);
  }

  async listNutritionLogs(profileId: string, date: string): Promise<NutritionLog[]> {
    const rows = (await must(
      getClient()
        .from('nutrition_logs')
        .select('*')
        .eq('profile_id', profileId)
        .eq('date', date)
        .order('created_at', { ascending: true }) as never,
    )) as Record<string, unknown>[];
    return rows.map((r) => toCamel<NutritionLog>(r));
  }

  async deleteNutritionLog(profileId: string, id: string): Promise<boolean> {
    const { error, count } = await getClient()
      .from('nutrition_logs')
      .delete({ count: 'exact' })
      .eq('profile_id', profileId)
      .eq('id', id);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async addBodyProgress(entry: BodyProgressEntry): Promise<BodyProgressEntry> {
    const rows = (await must(
      getClient().from('body_progress_entries').insert(toSnake(entry)).select().limit(1) as never,
    )) as Record<string, unknown>[];
    return toCamel<BodyProgressEntry>(rows[0]);
  }

  async listBodyProgress(profileId: string, limit = 60): Promise<BodyProgressEntry[]> {
    const rows = (await must(
      getClient()
        .from('body_progress_entries')
        .select('*')
        .eq('profile_id', profileId)
        .order('date', { ascending: false })
        .limit(limit) as never,
    )) as Record<string, unknown>[];
    return rows.map((r) => toCamel<BodyProgressEntry>(r));
  }

  // ---- medios privados ----
  async savePrivateMedia(media: PrivateMedia): Promise<PrivateMedia> {
    const rows = (await must(
      getClient().from('private_media').insert(toSnake(media)).select().limit(1) as never,
    )) as Record<string, unknown>[];
    return toCamel<PrivateMedia>(rows[0]);
  }

  async getPrivateMedia(profileId: string, id: string): Promise<PrivateMedia | null> {
    const rows = (await must(
      getClient().from('private_media').select('*').eq('profile_id', profileId).eq('id', id).limit(1) as never,
    )) as Record<string, unknown>[];
    return rows[0] ? toCamel<PrivateMedia>(rows[0]) : null;
  }

  async deletePrivateMedia(profileId: string, id: string): Promise<boolean> {
    const { error, count } = await getClient()
      .from('private_media')
      .delete({ count: 'exact' })
      .eq('profile_id', profileId)
      .eq('id', id);
    if (error) throw error;
    // El archivo en Storage privado debe borrarse con la misma autorización.
    await getClient().storage.from('private-media').remove([`${profileId}/${id}`]);
    return (count ?? 0) > 0;
  }

  // ---- historia ----
  async listStoryArcs(): Promise<StoryArc[]> {
    const rows = (await must(
      getClient().from('story_arcs').select('*').order('order', { ascending: true }) as never,
    )) as Record<string, unknown>[];
    return rows.map((r) => toCamel<StoryArc>(r));
  }

  async getStoryState(profileId: string): Promise<StoryState> {
    const rows = (await must(
      getClient().from('story_state').select('*').eq('profile_id', profileId).limit(1) as never,
    )) as Record<string, unknown>[];
    if (!rows[0]) {
      const ins = (await must(
        getClient().from('story_state').insert({ profile_id: profileId }).select().limit(1) as never,
      )) as Record<string, unknown>[];
      return toCamel<StoryState>(ins[0]);
    }
    return toCamel<StoryState>(rows[0]);
  }

  async updateStoryState(profileId: string, patch: Partial<StoryState>): Promise<StoryState> {
    const rows = (await must(
      getClient()
        .from('story_state')
        .update({ ...toSnake(patch), updated_at: nowIso() })
        .eq('profile_id', profileId)
        .select()
        .limit(1) as never,
    )) as Record<string, unknown>[];
    return toCamel<StoryState>(rows[0]);
  }

  async saveStoryScene(scene: StoryScene): Promise<void> {
    const { error } = await getClient()
      .from('story_scenes')
      .upsert(toSnake(scene), { onConflict: 'id' });
    if (error) throw error;
  }

  async getStoryScene(id: string): Promise<StoryScene | null> {
    const rows = (await must(
      getClient().from('story_scenes').select('*').eq('id', id).limit(1) as never,
    )) as Record<string, unknown>[];
    return rows[0] ? toCamel<StoryScene>(rows[0]) : null;
  }

  async listStoryScenes(arcId: string): Promise<StoryScene[]> {
    const rows = (await must(
      getClient().from('story_scenes').select('*').eq('arc_id', arcId) as never,
    )) as Record<string, unknown>[];
    return rows.map((r) => toCamel<StoryScene>(r));
  }

  // ---- informes / hábitos / ajustes ----
  async upsertDailyReport(report: DailyReport): Promise<DailyReport> {
    const rows = (await must(
      getClient()
        .from('daily_reports')
        .upsert(toSnake(report), { onConflict: 'profile_id,date' })
        .select()
        .limit(1) as never,
    )) as Record<string, unknown>[];
    return toCamel<DailyReport>(rows[0]);
  }

  async getDailyReport(profileId: string, date: string): Promise<DailyReport | null> {
    const rows = (await must(
      getClient().from('daily_reports').select('*').eq('profile_id', profileId).eq('date', date).limit(1) as never,
    )) as Record<string, unknown>[];
    return rows[0] ? toCamel<DailyReport>(rows[0]) : null;
  }

  async setHabitCheck(check: HabitCheck): Promise<void> {
    const { error } = await getClient()
      .from('habit_checks')
      .upsert(toSnake(check), { onConflict: 'profile_id,date,habit_id' });
    if (error) throw error;
  }

  async getHabitChecks(profileId: string, date: string): Promise<HabitCheck[]> {
    const rows = (await must(
      getClient().from('habit_checks').select('*').eq('profile_id', profileId).eq('date', date) as never,
    )) as Record<string, unknown>[];
    return rows.map((r) => toCamel<HabitCheck>(r));
  }

  async getSettings(profileId: string): Promise<UserSettings> {
    const rows = (await must(
      getClient().from('user_settings').select('*').eq('profile_id', profileId).limit(1) as never,
    )) as Record<string, unknown>[];
    if (!rows[0]) {
      const ins = (await must(
        getClient().from('user_settings').insert({ profile_id: profileId }).select().limit(1) as never,
      )) as Record<string, unknown>[];
      return toCamel<UserSettings>(ins[0]);
    }
    return toCamel<UserSettings>(rows[0]);
  }

  async updateSettings(profileId: string, patch: Partial<UserSettings>): Promise<UserSettings> {
    const rows = (await must(
      getClient()
        .from('user_settings')
        .update({ ...toSnake(patch), updated_at: nowIso() })
        .eq('profile_id', profileId)
        .select()
        .limit(1) as never,
    )) as Record<string, unknown>[];
    return toCamel<UserSettings>(rows[0]);
  }

  // ---- privacidad ----
  async exportProfileData(profileId: string): Promise<Record<string, unknown>> {
    const c = getClient();
    const pick = async (table: string) =>
      (await must(c.from(table).select('*').eq('profile_id', profileId) as never)) as Record<string, unknown>[];
    const one = async (table: string, key: string) => {
      const rows = (await must(c.from(table).select('*').eq(key, profileId).limit(1) as never)) as Record<string, unknown>[];
      return rows[0] ? toCamel(rows[0]) : null;
    };
    return {
      exportedAt: nowIso(),
      app: 'FORJA',
      profile: await one('profiles', 'id'),
      stats: await one('character_stats', 'profile_id'),
      sessions: (await pick('training_sessions')).map(toCamel),
      xpEvents: (await pick('xp_events')).map(toCamel),
      sleepLogs: (await pick('sleep_logs')).map(toCamel),
      wellbeingLogs: (await pick('wellbeing_logs')).map(toCamel),
      nutritionLogs: (await pick('nutrition_logs')).map(toCamel),
      bodyProgress: (await pick('body_progress_entries')).map(toCamel),
      privateMedia: (await pick('private_media')).map(toCamel),
      storyState: await one('story_state', 'profile_id'),
      dailyReports: (await pick('daily_reports')).map(toCamel),
      habitChecks: (await pick('habit_checks')).map(toCamel),
      settings: await one('user_settings', 'profile_id'),
    };
  }

  async deleteProfileData(profileId: string): Promise<void> {
    const c = getClient();
    // Orden: primero dependencias, luego el perfil (cascade lo respalda).
    for (const table of [
      'xp_events',
      'training_sessions',
      'sleep_logs',
      'wellbeing_logs',
      'nutrition_logs',
      'body_progress_entries',
      'private_media',
      'story_state',
      'daily_reports',
      'habit_checks',
      'user_settings',
      'character_stats',
    ]) {
      const { error } = await c.from(table).delete().eq('profile_id', profileId);
      if (error) throw error;
    }
    const { error } = await c.from('profiles').delete().eq('id', profileId);
    if (error) throw error;
    await c.storage.from('private-media').remove([profileId]);
  }
}

let instance: SupabaseRepository | null = null;
export function supabaseRepository(): SupabaseRepository {
  if (!instance) instance = new SupabaseRepository();
  return instance;
}
