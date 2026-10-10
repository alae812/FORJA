/**
 * GET /api/story — Estado narrativo: arcos, escena actual y si hay IA configurada.
 */
import { getStoryOverview } from '@/lib/services/story';
import { authed, ok, serverError } from '@/lib/api/helpers';

export async function GET() {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const overview = await getStoryOverview(auth.profileId);
    return ok(overview);
  } catch (e) {
    return serverError(e);
  }
}
