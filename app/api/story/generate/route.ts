/**
 * POST /api/story/generate — Genera una escena bajo demanda para un evento.
 * Body: { triggerEvent, playerNote? }
 * Límite: 10 generaciones IA por día (además del rate limit por minuto).
 * Sin proveedor configurado o ante fallos => escena de reserva original.
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { generateSceneForTrigger } from '@/lib/services/story';
import { supportedTriggers } from '@/lib/story/fallback';
import { rateLimit } from '@/lib/privacy/rateLimit';
import { STORY_LIMITS } from '@/lib/gamification/config';
import { authed, ok, fail, parse, serverError } from '@/lib/api/helpers';

const bodySchema = z.object({
  triggerEvent: z.enum(supportedTriggers() as [string, ...string[]]),
  playerNote: z.string().trim().max(300).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    if (!rateLimit(`story:gen:${auth.profileId}`, 5, 60_000)) {
      return fail('Demasiadas peticiones. Espera un minuto.', 429);
    }
    const json = await req.json().catch(() => ({}));
    const parsed = parse(bodySchema, json);
    if (!parsed.ok) return parsed.response;

    const { scene, mode } = await generateSceneForTrigger(
      auth.profileId,
      parsed.data.triggerEvent as Parameters<typeof generateSceneForTrigger>[1],
      { playerNote: parsed.data.playerNote },
    );
    return ok({ scene, mode, dailyLimit: STORY_LIMITS.maxGenerationsPerDay }, 201);
  } catch (e) {
    return serverError(e);
  }
}
