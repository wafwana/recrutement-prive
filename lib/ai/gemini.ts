import { AiStructuredRequest } from "./types";
import { safeLogError, safeLogInfo } from "./privacy";

/**
 * Calls Gemini REST API using Google's Generative Language API.
 * The API key is sent only in the x-goog-api-key header.
 * Never log raw prompts, source text, CV data, or API response bodies.
 */

/**
 * Gemini's structured-output schema accepts JSON Schema subsets. Convert
 * nullable union types (for example ["string", "null"]) into anyOf, which
 * is supported by the GenerateContent schema format.
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
    if (key === "type" && Array.isArray(child)) {
      const types = child.filter((type): type is string => typeof type === "string");
      if (types.includes("null")) {
        const nonNullTypes = types.filter((type) => type !== "null");
        normalized.anyOf = [
          ...nonNullTypes.map((type) => ({ type })),
          { type: "null" },
        ];
      } else {
        normalized[key] = types.length === 1 ? types[0] : types;
      }
      continue;
    }
    normalized[key] = normalizeGeminiJsonSchema(child);
  }
  return normalized;
}

/** Use the documented GenerateContent REST responseFormat schema. */
export function buildGeminiGenerationConfig(schema: Record<string, unknown>) {
  return {
    responseFormat: {
      text: {
        mimeType: "application/json",
        schema: normalizeGeminiJsonSchema(schema),
      },
    },
  };
}

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

  const model = request.modelOverride || getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const parts: Array<Record<string, unknown>> = [];

  if (request.fileInput) {
    const base64Data = request.fileInput.buffer.toString("base64");
    parts.push({ inline_data: { mime_type: request.fileInput.mimeType, data: base64Data } });
  }

  const textContent = request.systemPrompt
    ? `${request.systemPrompt}\\n\\n${request.userPrompt}`
    : request.userPrompt;
  parts.push({ text: textContent });

  const payload = {
    contents: [{ parts }],
    generationConfig: buildGeminiGenerationConfig(request.jsonSchema as Record<string, unknown>),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      safeLogError("GEMINI", `Erreur de communication API (HTTP ${res.status}).`);
      return null;
    }

    const resData = (await res.json()) as {
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
    safeLogError("GEMINI", "Échec du traitement de la requête IA.");
    return null;
  }
}
