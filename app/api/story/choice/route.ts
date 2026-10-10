/**
 * POST /api/story/choice — Aplica la elección de una escena.
 * Body: { sceneId, choiceId }
 */
import { NextRequest } from 'next/server';
import { applyStoryChoice } from '@/lib/services/story';
import { storyChoiceSchema } from '@/lib/validation/schemas';
import { authed, ok, fail, parse, serverError } from '@/lib/api/helpers';

export async function POST(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const json = await req.json().catch(() => ({}));
    const parsed = parse(storyChoiceSchema, json);
    if (!parsed.ok) return parsed.response;

    const outcome = await applyStoryChoice(
      auth.profileId,
      parsed.data.sceneId,
      parsed.data.choiceId,
    );
    if (!outcome) return fail('Escena o elección no válida', 404);
    return ok(outcome);
  } catch (e) {
    return serverError(e);
  }
}
