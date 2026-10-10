/**
 * FORJA — Servicio del motor narrativo (servidor).
 * - Los eventos reales (primera sesión, racha, marca, regreso, nivel, semana)
 *   generan escenas bajo demanda (no en cada interacción).
 * - IA configurable con límites diarios; ante fallo o modo demo, escenas de
 *   reserva originales. El modo queda registrado y la UI lo muestra honestamente.
 * - Las elecciones persisten y sus efectos (flags, XP, cosméticos) influyen
 *   en escenas futuras.
 */
import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db';
import { generateSceneWithAi, isAiConfigured, type SceneGenContext } from '@/lib/ai/provider';
import { buildFallbackScene } from '@/lib/story/fallback';
import { STORY_LIMITS, COSMETIC_REWARDS } from '@/lib/gamification/config';
import { levelForXp } from '@/lib/gamification/levels';
import type {
  StoryScene,
  StoryState,
  StoryTriggerEvent,
  XpEvent,
} from '@/types';

const nowIso = (): string => new Date().toISOString();
const todayStr = (): string => new Date().toISOString().slice(0, 10);

function arcForTrigger(trigger: StoryTriggerEvent): string {
  switch (trigger) {
    case 'onboarding_complete':
    case 'level_up':
      return 'llamada';
    case 'first_session':
      return 'primer-golpe';
    case 'streak_3':
    case 'personal_best':
    case 'weekly_goal':
      return 'ritmo';
    case 'return_after_rest':
      return 'regreso';
    default:
      return 'llamada';
  }
}

async function aiGenerationsToday(): Promise<number> {
  const db = getDb();
  const arcs = await db.listStoryArcs();
  let count = 0;
  const today = todayStr();
  for (const arc of arcs) {
    const list = await db.listStoryScenes(arc.id);
    count += list.filter((s) => s.aiGenerated && s.createdAt.slice(0, 10) === today).length;
  }
  return count;
}

function storySummaryFor(state: StoryState): string {
  const flags = Object.keys(state.flags);
  const parts: string[] = [];
  if (state.choiceHistory.length === 0) parts.push('la historia acaba de empezar');
  else parts.push(`${state.choiceHistory.length} elecciones tomadas`);
  if (flags.length > 0) parts.push(`marcas: ${flags.slice(0, 6).join(', ')}`);
  if (state.unlockedCosmetics.length > 0)
    parts.push(`recompensas: ${state.unlockedCosmetics.join(', ')}`);
  return parts.join('; ') + '.';
}

export interface GeneratedSceneOutcome {
  scene: StoryScene;
  /** 'ai' | 'fallback' (reserva original). Nunca se finge IA en demo. */
  mode: 'ai' | 'fallback';
}

/** Genera (o recupera de reserva) una escena para un evento */
export async function generateSceneForTrigger(
  profileId: string,
  trigger: StoryTriggerEvent,
  opts: { playerNote?: string } = {},
): Promise<GeneratedSceneOutcome> {
  const db = getDb();
  const [profile, stats, state] = await Promise.all([
    db.getProfile(profileId),
    db.getStats(profileId),
    db.getStoryState(profileId),
  ]);
  const heroName = profile?.heroName ?? 'Héroe';
  const arcId = arcForTrigger(trigger);

  let mode: 'ai' | 'fallback' = 'fallback';
  let sceneData: Omit<StoryScene, 'id' | 'createdAt'> | null = null;

  const underLimit = (await aiGenerationsToday()) < STORY_LIMITS.maxGenerationsPerDay;
  if (isAiConfigured() && underLimit) {
    const recentEvents = await db.listXpEvents(profileId, { limit: 20 });
    const achievements = recentEvents
      .filter((e) => e.kind === 'session_complete' || e.kind === 'daily_goal')
      .slice(0, 3)
      .map((e) => String(e.meta?.detail ?? e.kind));
    const lastChoice = state.choiceHistory[state.choiceHistory.length - 1];
    const prevScene = lastChoice ? await db.getStoryScene(lastChoice.sceneId) : null;
    const prevLabel = prevScene?.choices.find((c) => c.id === lastChoice?.choiceId)?.label;

    const ctx: SceneGenContext = {
      heroName,
      level: stats.level,
      xpStr: stats.xpStr,
      xpSta: stats.xpSta,
      xpWis: stats.xpWis,
      recentAchievements: achievements,
      previousChoiceLabel: prevLabel,
      triggerEvent: trigger,
      storySummary: storySummaryFor(state),
      flags: state.flags,
      playerNote: opts.playerNote,
    };
    const outcome = await generateSceneWithAi(ctx);
    if (outcome.ok && outcome.scene) {
      mode = 'ai';
      sceneData = {
        arcId,
        title: outcome.scene.title,
        narration: outcome.scene.narration,
        backgroundKey: outcome.scene.backgroundKey,
        characterKey: outcome.scene.characterKey,
        choices: outcome.scene.choices.map((c) => ({
          id: c.id,
          label: c.label,
          effect: c.effect,
        })),
        triggerEvent: trigger,
        aiGenerated: true,
      };
    }
  }

  if (!sceneData) {
    const caminoFlag = Object.keys(state.flags).find((k) => k.startsWith('camino:'));
    sceneData = buildFallbackScene(trigger, {
      heroName,
      level: stats.level,
      camino: caminoFlag?.split(':')[1],
    });
    sceneData.arcId = arcId;
  }

  const scene: StoryScene = {
    id: `scene_${randomUUID().slice(0, 8)}`,
    ...sceneData,
    createdAt: nowIso(),
  };
  await db.saveStoryScene(scene);

  const seenSceneIds = state.seenSceneIds.includes(scene.id)
    ? state.seenSceneIds
    : [...state.seenSceneIds, scene.id];
  const unlockedArcs = state.unlockedArcs.includes(arcId)
    ? state.unlockedArcs
    : [...state.unlockedArcs, arcId];
  await db.updateStoryState(profileId, {
    currentSceneId: scene.id,
    seenSceneIds,
    unlockedArcs,
  });

  return { scene, mode };
}

export interface ChoiceOutcome {
  state: StoryState;
  applied: {
    flag?: string;
    xpBonus?: number;
    unlockCosmetic?: string;
    nextSceneId?: string;
  };
}

/** Aplica la elección de una escena: persiste flags, XP y cosméticos */
export async function applyStoryChoice(
  profileId: string,
  sceneId: string,
  choiceId: string,
): Promise<ChoiceOutcome | null> {
  const db = getDb();
  const scene = await db.getStoryScene(sceneId);
  if (!scene) return null;
  const choice = scene.choices.find((c) => c.id === choiceId);
  if (!choice) return null;

  const state = await db.getStoryState(profileId);
  const applied: ChoiceOutcome['applied'] = {};

  const flags = { ...state.flags };
  if (choice.effect?.flag) {
    const [k, v] = choice.effect.flag.split(':');
    flags[k] = v ?? true;
    applied.flag = choice.effect.flag;
  }

  if (choice.effect?.xpBonus && choice.effect.xpBonus > 0) {
    const bonus = Math.min(25, Math.max(0, Math.floor(choice.effect.xpBonus)));
    const event: XpEvent = {
      id: randomUUID(),
      profileId,
      sessionId: undefined,
      kind: 'story_bonus',
      attribute: 'wis',
      xp: bonus,
      meta: { detail: `Elección narrativa: ${choice.label}`, sceneId },
      createdAt: nowIso(),
    };
    await db.appendXpEvents([event]);
    const stats = await db.getStats(profileId);
    const totalXp = Math.round((stats.totalXp + bonus) * 10) / 10;
    await db.saveStats({
      ...stats,
      totalXp,
      xpWis: Math.round((stats.xpWis + bonus) * 10) / 10,
      level: levelForXp(totalXp),
    });
    applied.xpBonus = bonus;
  }

  const unlockedCosmetics = [...state.unlockedCosmetics];
  if (choice.effect?.unlockCosmetic && !unlockedCosmetics.includes(choice.effect.unlockCosmetic)) {
    unlockedCosmetics.push(choice.effect.unlockCosmetic);
    applied.unlockCosmetic = choice.effect.unlockCosmetic;
  }

  // Recompensas cosméticas por nivel (se verifican aquí también)
  const stats = await db.getStats(profileId);
  for (const reward of COSMETIC_REWARDS) {
    if (stats.level >= reward.unlockLevel && !unlockedCosmetics.includes(reward.id)) {
      unlockedCosmetics.push(reward.id);
    }
  }

  const choiceHistory = [
    ...state.choiceHistory,
    { sceneId, choiceId, at: nowIso() },
  ];

  const nextState = await db.updateStoryState(profileId, {
    flags,
    unlockedCosmetics,
    choiceHistory,
    currentSceneId: choice.nextSceneId ?? state.currentSceneId,
  });

  if (choice.nextSceneId) applied.nextSceneId = choice.nextSceneId;

  return { state: nextState, applied };
}

/** Estado narrativo enriquecido para la UI */
export async function getStoryOverview(profileId: string) {
  const db = getDb();
  const [arcs, state] = await Promise.all([db.listStoryArcs(), db.getStoryState(profileId)]);
  const currentScene = state.currentSceneId ? await db.getStoryScene(state.currentSceneId) : null;
  return {
    arcs: arcs.map((a) => ({
      ...a,
      unlocked: state.unlockedArcs.includes(a.id),
    })),
    state,
    currentScene,
    aiConfigured: isAiConfigured(),
  };
}
