import { AiStructuredRequest } from "./types";
import { safeLogError, safeLogInfo } from "./privacy";

/**
 * Calls Gemini REST API using Google's Generative Language API.
 * The API key is sent only in the x-goog-api-key header.
 * Never log raw prompts, source text, CV data, or API response bodies.
 */

/**
 * Walk the JSON schema without rewriting its semantics.
 *
 * Gemini's GenerateContent structured-output schema explicitly supports
 * nullable types as { type: ["string", "null"] }. Rewriting these unions to
 * anyOf is not a safe compatibility transformation and can cause HTTP 400
 * responses from the API. Preserve type arrays exactly.
 */
export function normalizeGeminiJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeGeminiJsonSchema);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const source = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(source)) {
    normalized[key] = normalizeGeminiJsonSchema(child);
  }
  return normalized;
}

/** Use GenerateContent REST JSON mode with the documented JSON Schema field. */
export function buildGeminiGenerationConfig(schema: Record<string, unknown>) {
  return {
    responseMimeType: "application/json",
    responseJsonSchema: normalizeGeminiJsonSchema(schema),
  };
}

export const GEMINI_REQUEST_TIMEOUT_MS = 15_000;
const GEMINI_UNAVAILABLE_COOLDOWN_MS = 60_000;
let geminiUnavailableUntil = 0;

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
}

export async function callGeminiStructured<T>(
  request: AiStructuredRequest<T>
): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    safeLogError("GEMINI", "GEMINI_API_KEY non configurée dans l'environnement.");
    return null;
  }

  if (Date.now() < geminiUnavailableUntil) {
    safeLogInfo("GEMINI", "Fournisseur temporairement indisponible; utilisation du fallback métier.");
    return null;
  }

  const model = request.modelOverride || getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const parts: Array<Record<string, unknown>> = [];

  if (request.fileInput) {
    const base64Data = request.fileInput.buffer.toString("base64");
    parts.push({ inline_data: { mime_type: request.fileInput.mimeType, data: base64Data } });
  }

  const textContent = request.systemPrompt
    ? `${request.systemPrompt}\n\n${request.userPrompt}`
    : request.userPrompt;
  parts.push({ text: textContent });

  const payload = {
    contents: [{ parts }],
    generationConfig: buildGeminiGenerationConfig(request.jsonSchema as Record<string, unknown>),
  };

  const maxRetries = 1;
  let response: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS),
      });
    } catch {
      // Retry one transient network/timeout failure with a short bounded delay.
      // The shared retry budget remains one extra request per call.
      if (attempt < maxRetries) {
        safeLogInfo("GEMINI", "Échec réseau temporaire; nouvelle tentative bornée.");
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }
      geminiUnavailableUntil = Date.now() + GEMINI_UNAVAILABLE_COOLDOWN_MS;
      safeLogError("GEMINI", "Échec de communication avec l'API Gemini après une tentative bornée; fallback métier activé temporairement.");
      return null;
    }

    if (response.ok) break;

    const retryAfterHeader = response.headers.get("retry-after");
    let retryDelayMs: number | null = null;
    const retryableStatus = [500, 502, 503, 504].includes(response.status);
    if (attempt < maxRetries && (retryableStatus || response.status === 429)) {
      if (retryAfterHeader !== null) {
        const seconds = Number(retryAfterHeader);
        const parsedDate = Date.parse(retryAfterHeader);
        const requestedDelay = Number.isFinite(seconds) && retryAfterHeader.trim() !== ""
          ? seconds * 1000
          : Number.isFinite(parsedDate) ? parsedDate - Date.now() : Number.POSITIVE_INFINITY;
        // Never sleep longer than the bounded cron retry budget. If Google
        // requests a longer wait, defer to the next scheduled invocation.
        if (requestedDelay >= 0 && requestedDelay <= 750) retryDelayMs = requestedDelay;
      } else if (retryableStatus) {
        retryDelayMs = 350;
      }
    }

    if (retryDelayMs === null) {
      if ([429, 500, 502, 503, 504].includes(response.status)) {
        geminiUnavailableUntil = Date.now() + GEMINI_UNAVAILABLE_COOLDOWN_MS;
      }
      safeLogError("GEMINI", `Erreur de communication API (HTTP ${response.status}); fallback métier activé si nécessaire.`);
      return null;
    }

    safeLogInfo("GEMINI", `API temporairement indisponible (HTTP ${response.status}); une reprise bornée est tentée.`);
    try { await response.body?.cancel(); } catch { /* Ignore body cleanup errors. */ }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }

  if (!response?.ok) {
    safeLogError("GEMINI", `Erreur de communication API (HTTP ${response?.status ?? "inconnu"}).`);
    return null;
  }

  try {
    const resData = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      safeLogError("GEMINI", "Réponse vide de l'API Gemini.");
      return null;
    }
    const parsed = JSON.parse(rawText) as T;
    safeLogInfo("GEMINI", `Traitement IA terminé avec succès (modèle: ${model}).`);
    return parsed;
  } catch {
    safeLogError("GEMINI", "Échec du traitement de la réponse structurée Gemini.");
    return null;
  }
}
