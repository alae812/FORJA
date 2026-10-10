/**
 * FORJA — Servicio de entrenamientos (servidor).
 * Única autoridad para calcular XP, actualizar atributos y niveles.
 * - Creación idempotente por idempotencyKey (reintentos nunca duplican XP).
 * - Sesión + eventos + stats se aplican de forma atómica (applySessionResult).
 * - Eliminar revierte la XP con eventos negativos auditables (no borra el historial).
 */
import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db';
import {
  EMPTY_USAGE,
  calculateSessionXp,
  maybeAwardDailyGoal,
  type DayUsage,
} from '@/lib/gamification/xp';
import { detectLevelUps, levelForXp } from '@/lib/gamification/levels';
import { XP_RULES } from '@/lib/gamification/config';
import {
  EXERCISE_CATEGORIES,
  type AttributeKey,
  type CharacterStats,
  type ExerciseEntry,
  type StoryTriggerEvent,
  type TrainingSession,
  type XpBreakdownItem,
  type XpEvent,
} from '@/types';
import type { CreateSessionInput, UpdateSessionInput } from '@/lib/validation/schemas';

const nowIso = (): string => new Date().toISOString();

export interface CreateSessionResult {
  session: TrainingSession;
  /** true si ya existía una sesión con esa idempotencyKey (sin duplicar XP) */
  deduped: boolean;
  levelUps: number[];
  capped: boolean;
  storyTriggers: StoryTriggerEvent[];
  dailyGoalAwarded: boolean;
}

function toXpInput(exercises: ExerciseEntry[]) {
  return exercises.map((e) => ({
    category: e.category,
    sets: e.sets,
    durationMin: e.durationMin,
    targetMet: e.targetMet,
  }));
}

function buildEvents(
  profileId: string,
  sessionId: string,
  items: XpBreakdownItem[],
): XpEvent[] {
  return items.map((item) => ({
    id: randomUUID(),
    profileId,
    sessionId,
    kind: item.kind,
    attribute: item.attribute,
    xp: item.xp,
    meta: { detail: item.detail, units: item.units ?? 0 },
    createdAt: nowIso(),
  }));
}

function applyXpToStats(stats: CharacterStats, items: XpBreakdownItem[]): CharacterStats {
  const next: CharacterStats = { ...stats };
  for (const item of items) {
    next.totalXp += item.xp;
    if (item.attribute === 'str') next.xpStr += item.xp;
    else if (item.attribute === 'sta') next.xpSta += item.xp;
    else next.xpWis += item.xp;
  }
  // Saneamiento defensivo: la XP nunca es negativa en stats.
  next.totalXp = Math.max(0, Math.round(next.totalXp * 10) / 10);
  next.xpStr = Math.max(0, Math.round(next.xpStr * 10) / 10);
  next.xpSta = Math.max(0, Math.round(next.xpSta * 10) / 10);
  next.xpWis = Math.max(0, Math.round(next.xpWis * 10) / 10);
  next.level = levelForXp(next.totalXp);
  next.updatedAt = nowIso();
  return next;
}

/** Uso diario excluyendo la aportación de una sesión concreta (para edición) */
function usageWithoutSession(usage: DayUsage, session: TrainingSession): DayUsage {
  const next: DayUsage = { ...usage };
  for (const item of session.xpBreakdown) {
    const u = item.units ?? 0;
    if (item.kind === 'set') next.sets = Math.max(0, next.sets - u);
    else if (item.kind === 'set_bonus') next.setBonuses = Math.max(0, next.setBonuses - u);
    else if (item.kind === 'cardio') next.cardioMin = Math.max(0, next.cardioMin - u);
    else if (item.kind === 'mobility') next.mobilityMin = Math.max(0, next.mobilityMin - u);
    else if (item.kind === 'session_complete')
      next.sessionsCompleted = Math.max(0, next.sessionsCompleted - u);
  }
  return next;
}

function toLocalDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Detecta eventos narrativos a partir de la actividad real */
async function detectStoryTriggers(
  profileId: string,
  session: TrainingSession,
  isFirstCompleted: boolean,
  levelUps: number[],
): Promise<StoryTriggerEvent[]> {
  const db = getDb();
  const triggers: StoryTriggerEvent[] = [];
  if (isFirstCompleted) triggers.push('first_session');
  if (levelUps.length > 0) triggers.push('level_up');

  const today = session.date;
  const recent = await db.listSessions(profileId, { limit: 60 });
  const completed = recent.filter((s) => s.status === 'completed');

  // Racha de 3 días consecutivos con sesión completada o descanso adherido
  const settings = await db.getSettings(profileId);
  const activeDays = new Set<string>();
  for (const s of completed) activeDays.add(s.date);
  let streak = 0;
  const cursor = new Date(`${today}T12:00:00`);
  for (let i = 0; i < 30; i++) {
    const d = cursor.toISOString().slice(0, 10);
    const weekday = cursor.getDay();
    if (activeDays.has(d) || settings.plannedRestDays.includes(weekday)) streak++;
    else break;
    cursor.setDate(cursor.getDate() - 1);
  }
  if (streak >= 3) triggers.push('streak_3');

  // Vuelta tras descanso: última sesión completada hace > 4 días
  const prev = completed.filter((s) => s.id !== session.id).map((s) => s.date).sort();
  if (prev.length > 0) {
    const last = prev[prev.length - 1];
    const diffDays =
      (new Date(`${today}T12:00:00`).getTime() - new Date(`${last}T12:00:00`).getTime()) /
      86_400_000;
    if (diffDays > 4) triggers.push('return_after_rest');

    // Marca personal: supera la mejor XP de sesión anterior
    const bestPrev = Math.max(...completed.filter((s) => s.id !== session.id).map((s) => s.xpAwarded), 0);
    if (session.xpAwarded > bestPrev && bestPrev > 0) triggers.push('personal_best');
  }

  // Objetivo semanal: 4+ sesiones en los últimos 7 días
  const weekAgo = new Date(`${today}T12:00:00`);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekStr = weekAgo.toISOString().slice(0, 10);
  const weekCount = completed.filter((s) => s.date >= weekStr && s.date <= today).length;
  if (weekCount >= 4) triggers.push('weekly_goal');

  return [...new Set(triggers)];
}

export async function createTrainingSession(
  profileId: string,
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  const db = getDb();

  // Idempotencia: si la clave ya existe, devolver sin duplicar nada.
  const existing = await db.getSessionByIdempotencyKey(profileId, input.idempotencyKey);
  if (existing) {
    return {
      session: existing,
      deduped: true,
      levelUps: [],
      capped: false,
      storyTriggers: [],
      dailyGoalAwarded: false,
    };
  }

  const usage = await db.getDayUsage(profileId, input.date);
  const exercises: ExerciseEntry[] = input.exercises.map((e) => ({
    id: randomUUID(),
    name: e.name,
    category: e.category,
    attribute: EXERCISE_CATEGORIES[e.category].attribute,
    sets: e.sets,
    reps: e.reps,
    loadKg: e.loadKg,
    durationMin: e.durationMin,
    targetMet: e.targetMet,
    notes: e.notes,
  }));

  const completed = input.status === 'completed';
  const calc = calculateSessionXp(toXpInput(exercises), completed, usage);

  const session: TrainingSession = {
    id: randomUUID(),
    profileId,
    idempotencyKey: input.idempotencyKey,
    date: input.date,
    status: input.status,
    exercises,
    xpAwarded: calc.totalXp,
    xpBreakdown: calc.items,
    isRestDay: input.isRestDay ?? false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const events = buildEvents(profileId, session.id, calc.items);

  // Stats: XP por atributo + nivel
  const before = await db.getStats(profileId);
  const beforeTotal = before.totalXp;
  let stats = applyXpToStats(before, calc.items);

  // Bonus de objetivo diario (una vez al día, a WIS por constancia)
  const settings = await db.getSettings(profileId);
  const trainingXpSoFar = await db.getTrainingXpForDay(profileId, input.date);
  const goal = maybeAwardDailyGoal(
    trainingXpSoFar + calc.totalXp,
    settings.dailyGoalXp,
    await db.dailyGoalAwarded(profileId, input.date),
  );
  let goalAwarded = false;
  if (goal.awarded) {
    const goalEvent: XpEvent = {
      id: randomUUID(),
      profileId,
      sessionId: session.id,
      kind: 'daily_goal',
      attribute: 'wis',
      xp: goal.xp,
      meta: { detail: `Objetivo diario cumplido (${settings.dailyGoalXp} XP)` },
      createdAt: nowIso(),
    };
    events.push(goalEvent);
    stats = applyXpToStats(stats, [
      { kind: 'daily_goal', attribute: 'wis', xp: goal.xp, detail: goalEvent.meta.detail as string, units: 1 },
    ]);
    goalAwarded = true;
  }

  const levelUps = detectLevelUps(beforeTotal, stats.totalXp);

  await db.applySessionResult({ session, events, stats });

  const prevCompleted = (await db.listSessions(profileId, { status: 'completed', limit: 2 })).filter(
    (s) => s.id !== session.id,
  );
  const storyTriggers = completed
    ? await detectStoryTriggers(profileId, session, prevCompleted.length === 0, levelUps)
    : [];

  return { session, deduped: false, levelUps, capped: calc.capped, storyTriggers, dailyGoalAwarded: goalAwarded };
}

export interface DeleteSessionResult {
  reversedXp: number;
}

/** Elimina una sesión revirtiendo su XP de forma auditable */
export async function deleteTrainingSession(
  profileId: string,
  sessionId: string,
): Promise<DeleteSessionResult | null> {
  const db = getDb();
  const session = await db.getSession(profileId, sessionId);
  if (!session || session.status === 'cancelled') return null;

  const reversals: XpEvent[] = session.xpBreakdown.map((item) => ({
    id: randomUUID(),
    profileId,
    sessionId: session.id,
    kind: 'reversal' as const,
    attribute: item.attribute as AttributeKey,
    xp: -item.xp,
    meta: { detail: `Reversión: ${item.detail}`, reverses: item.kind, units: item.units ?? 0 },
    createdAt: nowIso(),
  }));

  const stats = await db.getStats(profileId);
  // Revertir = aplicar los mismos items en negativo
  const reversed = applyXpToStats(
    stats,
    session.xpBreakdown.map((i) => ({ ...i, xp: -i.xp })),
  );

  const cancelled: TrainingSession = {
    ...session,
    status: 'cancelled',
    updatedAt: nowIso(),
  };

  await db.applySessionResult({ session: cancelled, events: reversals, stats: reversed });

  const reversedXp = Math.round(session.xpBreakdown.reduce((s, i) => s + i.xp, 0) * 10) / 10;
  return { reversedXp };
}

export interface UpdateSessionResult {
  session: TrainingSession;
  levelUps: number[];
  capped: boolean;
}

/** Edita una sesión: revierte la XP anterior y aplica la nueva (auditable) */
export async function updateTrainingSession(
  profileId: string,
  sessionId: string,
  input: UpdateSessionInput,
): Promise<UpdateSessionResult | null> {
  const db = getDb();
  const session = await db.getSession(profileId, sessionId);
  if (!session || session.status === 'cancelled') return null;

  const newDate = input.date ?? session.date;
  const newStatus = input.status ?? session.status;

  const exercises: ExerciseEntry[] = (input.exercises ?? session.exercises).map((e) => ({
    id: (e as ExerciseEntry).id ?? randomUUID(),
    name: e.name,
    category: e.category,
    attribute: EXERCISE_CATEGORIES[e.category].attribute,
    sets: e.sets,
    reps: e.reps,
    loadKg: e.loadKg,
    durationMin: e.durationMin,
    targetMet: e.targetMet,
    notes: e.notes,
  }));

  // Uso diario sin la aportación de esta sesión (para no contar doble)
  const rawUsage = await db.getDayUsage(profileId, newDate);
  const usage = session.date === newDate ? usageWithoutSession(rawUsage, session) : rawUsage;

  const calc = calculateSessionXp(toXpInput(exercises), newStatus === 'completed', usage);

  const updated: TrainingSession = {
    ...session,
    date: newDate,
    status: newStatus,
    exercises,
    xpAwarded: calc.totalXp,
    xpBreakdown: calc.items,
    updatedAt: nowIso(),
  };

  // Eventos: reversión de lo anterior + lo nuevo
  const reversalEvents: XpEvent[] = session.xpBreakdown.map((item) => ({
    id: randomUUID(),
    profileId,
    sessionId: session.id,
    kind: 'reversal' as const,
    attribute: item.attribute as AttributeKey,
    xp: -item.xp,
    meta: { detail: `Reversión por edición: ${item.detail}`, reverses: item.kind },
    createdAt: nowIso(),
  }));
  const newEvents = buildEvents(profileId, session.id, calc.items);

  const before = await db.getStats(profileId);
  const beforeTotal = before.totalXp;
  const afterReversal = applyXpToStats(
    before,
    session.xpBreakdown.map((i) => ({ ...i, xp: -i.xp })),
  );
  const stats = applyXpToStats(afterReversal, calc.items);
  const levelUps = detectLevelUps(beforeTotal, stats.totalXp);

  await db.applySessionResult({
    session: updated,
    events: [...reversalEvents, ...newEvents],
    stats,
  });

  return { session: updated, levelUps, capped: calc.capped };
}

/** Historial de XP con detalle para la pantalla de progreso */
export async function getXpHistory(
  profileId: string,
  days: number,
): Promise<{ date: string; xp: number }[]> {
  const db = getDb();
  const out: { date: string; xp: number }[] = [];
  const cursor = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    const date = toLocalDate(d.toISOString());
    out.push({ date, xp: await db.getTrainingXpForDay(profileId, date) });
  }
  return out;
}

export { XP_RULES, EMPTY_USAGE };
