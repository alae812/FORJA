/**
 * FORJA — Límites de frecuencia en memoria (por proceso).
 * Para endpoints sensibles (generación de historia, análisis visual).
 * En despliegues multinstancia, sustituir por un almacén compartido (Redis).
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Devuelve true si la petición está permitida, false si excede el límite.
 * @param key clave única (p. ej. `story:generate:<profileId>:<fecha>`)
 * @param limit máximo de peticiones por ventana
 * @param windowMs duración de la ventana en ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Limpieza oportunista de cubos expirados */
export function pruneRateLimits(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}
