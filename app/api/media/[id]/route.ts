/**
 * GET /api/media/[id] — Sirve un medio privado SOLO a su dueño (sesión).
 * No existen URLs públicas: el acceso exige autenticación en cada petición.
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getDb } from '@/lib/db';
import { mediaDir } from '@/lib/db/local';
import { authed, fail, serverError } from '@/lib/api/helpers';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const { id } = await params;
    const media = await getDb().getPrivateMedia(auth.profileId, id);
    if (!media) return fail('Medio no encontrado', 404);

    const dir = path.join(mediaDir(), id);
    const files = await fs.readdir(dir).catch(() => [] as string[]);
    const file = files.find((f) => f.startsWith('original.'));
    if (!file) return fail('Archivo no encontrado', 404);
    const bytes = await fs.readFile(path.join(dir, file));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'content-type': media.mimeType,
        'cache-control': 'private, max-age=60',
      },
    });
  } catch (e) {
    return serverError(e);
  }
}
