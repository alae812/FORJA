/**
 * POST /api/body-analysis — Análisis visual con consentimiento explícito.
 *
 * Recibe multipart: photo (imagen ≤ 8 MB), consent ("true"), purpose, saveOriginal ("true"|"false").
 *
 * Garantías:
 * - Sin consentimiento explícito no se procesa nada (400).
 * - El original NO se guarda por defecto; solo si saveOriginal=true.
 * - Sin proveedor de visión configurado => MODO DEMO claramente marcado:
 *   devuelve observaciones de ejemplo etiquetadas como demostración,
 *   NUNCA fingiendo un análisis real.
 * - Con proveedor: se envía la imagen con instrucciones estrictas
 *   (solo aspectos visuales justificables: postura visible, condiciones de la
 *   foto; prohibido inferir grasa corporal, masa muscular, fuerza, hormonas,
 *   salud, atractivo o diagnosticar).
 * - La imagen nunca se publica ni se usa para entrenar modelos.
 */
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getDb } from '@/lib/db';
import { mediaDir } from '@/lib/db/local';
import { rateLimit } from '@/lib/privacy/rateLimit';
import { authed, ok, fail, serverError } from '@/lib/api/helpers';
import type { PrivateMedia } from '@/types';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function visionConfigured(): boolean {
  return Boolean(process.env.AI_VISION_API_KEY) && process.env.AI_VISION_PROVIDER !== 'demo';
}

const DEMO_OBSERVATIONS = [
  'MODO DEMO — esto es un ejemplo, no un análisis real de tu foto.',
  'En un análisis real, aquí se describiría únicamente lo visible: postura general y condiciones de la foto (luz, ángulo, ropa).',
  'Nunca se inferirían grasa corporal, masa muscular, fuerza, hormonas ni salud a partir de una imagen.',
  'Configura AI_VISION_API_KEY para activar el análisis con IA, o guarda la foto para comparar tu progreso visualmente.',
];

async function analyzeWithVision(bytes: Buffer, mime: string): Promise<string[]> {
  const apiKey = process.env.AI_VISION_API_KEY!;
  const model = process.env.AI_VISION_MODEL ?? 'claude-sonnet-4-5';
  const base64 = bytes.toString('base64');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      system:
        'Describe SOLO aspectos visuales técnicamente justificables de la foto: postura visible y condiciones de la toma (luz, ángulo). ' +
        'PROHIBIDO: estimar grasa corporal, masa muscular, fuerza, hormonas, salud, atractivo o diagnosticar nada. ' +
        'No puntúes a la persona. Responde en español, en 3-5 frases breves, sin juicios de valor.',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
            { type: 'text', text: 'Analiza esta foto según tus instrucciones.' },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Proveedor de visión: ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((c) => c.type === 'text')?.text ?? '';
  return text.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 8);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    if (!rateLimit(`vision:${auth.profileId}`, 10, 86_400_000)) {
      return fail('Límite diario de análisis alcanzado (10/día).', 429);
    }

    const form = await req.formData().catch(() => null);
    if (!form) return fail('Formulario inválido', 422);
    const consent = form.get('consent');
    if (consent !== 'true') {
      return fail('Se requiere tu consentimiento explícito para analizar la foto.', 422);
    }
    const file = form.get('photo');
    if (!(file instanceof File)) return fail('Falta la foto (photo).', 422);
    if (!ALLOWED.has(file.type)) return fail('Formato no admitido (usa JPG, PNG o WebP).', 422);
    if (file.size > MAX_BYTES) return fail('La foto supera los 8 MB.', 422);

    const bytes = Buffer.from(await file.arrayBuffer());
    const saveOriginal = form.get('saveOriginal') === 'true';
    const purpose =
      typeof form.get('purpose') === 'string' && (form.get('purpose') as string).length > 0
        ? String(form.get('purpose')).slice(0, 200)
        : 'Análisis visual de postura y condiciones de la foto';

    let mediaId: string | null = null;
    if (saveOriginal) {
      mediaId = randomUUID();
      const record: PrivateMedia = {
        id: mediaId,
        profileId: auth.profileId,
        kind: 'body_analysis',
        mimeType: file.type,
        sizeBytes: file.size,
        consentAt: new Date().toISOString(),
        consentPurpose: purpose,
        createdAt: new Date().toISOString(),
      };
      await getDb().savePrivateMedia(record);
      const dir = path.join(mediaDir(), mediaId);
      await fs.mkdir(dir, { recursive: true });
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      await fs.writeFile(path.join(dir, `original.${ext}`), bytes);
    }

    if (visionConfigured()) {
      try {
        const observations = await analyzeWithVision(bytes, file.type);
        return ok({
          mode: 'ai' as const,
          observations,
          mediaId,
          disclaimer:
            'Análisis limitado a aspectos visuales. No es una medición médica ni una evaluación de tu valía.',
        });
      } catch {
        return fail('El proveedor de visión falló. Inténtalo más tarde.', 502);
      }
    }

    // Modo demo honesto: sin proveedor no hay análisis real.
    return ok({
      mode: 'demo' as const,
      observations: DEMO_OBSERVATIONS,
      mediaId,
      disclaimer:
        'MODO DEMO: no se ha ejecutado ningún análisis real. Configura AI_VISION_API_KEY para activarlo.',
    });
  } catch (e) {
    return serverError(e);
  }
}

/** DELETE /api/body-analysis?id= — Borra un medio privado propio */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authed();
    if ('response' in auth) return auth.response;
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return fail('Falta el id', 422);
    const deleted = await getDb().deletePrivateMedia(auth.profileId, id);
    if (!deleted) return fail('Medio no encontrado', 404);
    return ok({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
