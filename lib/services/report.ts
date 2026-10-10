/**
 * FORJA — Servicio del Report Card diario (servidor).
 * Recopila los inputs reales y delega el cálculo a lib/gamification/report.ts.
 * Nunca inventa ceros: lo que falta queda como null y se lista en `missing`.
 */
import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db';
import { computeDailyReport } from '@/lib/gamification/report';
import type { DailyReport } from '@/types';

const nowIso = (): string => new Date().toISOString();

function toLocalDate(d: Date): string {
  // Fecha local del servidor expresada como YYYY-MM-DD (UTC del día operativo)
  return d.toISOString().slice(0, 10);
}

export function todayLocal(): string {
  return toLocalDate(new Date());
}

export async function buildDailyReport(profileId: string, date: string): Promise<DailyReport> {
  const db = getDb();
  const settings = await db.getSettings(profileId);
  const profile = await db.getProfile(profileId);
  const dailyGoalXp = profile?.dailyGoalXp ?? settings.dailyGoalXp;

  const trainingXpToday = await db.getTrainingXpForDay(profileId, date);
  const sessionsToday = await db.listSessions(profileId, { from: date, to: date, limit: 50 });
  const activeToday = sessionsToday.filter((s) => s.status !== 'cancelled');
  const sessionsPlannedToday = activeToday.filter((s) => s.status === 'planned').length;
  const sessionsCompletedToday = activeToday.filter((s) => s.status === 'completed').length;

  const weekday = new Date(`${date}T12:00:00`).getDay();
  const restDayAdhered =
    settings.plannedRestDays.includes(weekday) && sessionsCompletedToday === 0;

  // Hábitos
  const enabledHabits = settings.habits.filter((h) => h.enabled);
  const checks = await db.getHabitChecks(profileId, date);
  const doneSet = new Set(checks.filter((c) => c.done).map((c) => c.habitId));
  const habitsDone = enabledHabits.filter((h) => doneSet.has(h.id)).length;

  // Ventana de 7 días: plan vs cumplimiento (descanso adherido cuenta)
  let planWindowTotal = 0;
  let planWindowDone = 0;
  const cursor = new Date(`${date}T12:00:00`);
  for (let i = 0; i < 7; i++) {
    const d = toLocalDate(cursor);
    const wd = cursor.getDay();
    const daySessions = await db.listSessions(profileId, { from: d, to: d, limit: 20 });
    const active = daySessions.filter((s) => s.status !== 'cancelled');
    const hasPlan = active.length > 0;
    const isRest = settings.plannedRestDays.includes(wd);
    if (hasPlan || isRest) {
      planWindowTotal++;
      const completed = active.some((s) => s.status === 'completed');
      if (completed || (isRest && !completed && active.length === 0)) planWindowDone++;
      else if (isRest && completed) planWindowDone++;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  const sleep = await db.getSleepLog(profileId, date);
  const wellbeing = await db.getWellbeingLog(profileId, date);

  const computed = computeDailyReport({
    date,
    profileId,
    dailyGoalXp,
    trainingXpToday,
    sessionsPlannedToday,
    sessionsCompletedToday,
    restDayAdhered,
    habitsTotal: enabledHabits.length,
    habitsDone,
    planWindowTotal,
    planWindowDone,
    sleepQuality: sleep?.quality ?? null,
    wellbeingScore: wellbeing ? wellbeing.energy * 20 : null,
    xpEarned: trainingXpToday,
  });

  const report: DailyReport = {
    id: randomUUID(),
    profileId,
    date,
    score: computed.score,
    rank: computed.rank,
    components: computed.components,
    missing: computed.missing,
    xpEarned: trainingXpToday,
    sessionsCompleted: sessionsCompletedToday,
    isRestDay: computed.isRestDay,
    recommendation: computed.recommendation,
    createdAt: nowIso(),
  };

  return db.upsertDailyReport(report);
}
