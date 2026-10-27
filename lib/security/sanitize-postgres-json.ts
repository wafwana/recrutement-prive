/**
 * PostgreSQL text and JSONB values cannot contain the NUL character (U+0000).
 * Extracted CV text can contain it when a PDF/DOC parser encounters binary data.
 * Keep the original uploaded bytes intact; sanitize only text/structured values
 * that will be persisted as PostgreSQL text or JSON.
 */
export function sanitizePostgresJson<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(/\u0000/g, "") as T;
  }
  // Buffers hold the original uploaded bytes and must never be traversed as JSON objects.
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return value as T;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePostgresJson(item)) as T;
  }
  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key.replace(/\u0000/g, "")] = sanitizePostgresJson(item);
    }
    return sanitized as T;
  }
  return value;
}
