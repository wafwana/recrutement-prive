type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Lightweight in-process rate limiter for the first security layer.
 * For multi-instance/serverless production, replace the backing store with
 * shared infrastructure (for example Redis/Upstash) before relying on it
 * for distributed enforcement.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    buckets.set(key, next);
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: next.resetAt };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}
