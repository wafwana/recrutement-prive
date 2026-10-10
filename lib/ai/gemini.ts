import { AiStructuredRequest } from "./types";
import { safeLogError, safeLogInfo } from "./privacy";

/**
 * Calls Gemini REST API using Google's Generative Language API (`https://generativelanguage.googleapis.com/v1beta/models/...:generateContent`)
 * and returns structured JSON output strictly adhering to the requested JSON schema.
 *
 * Security & Privacy:
 * - Passes GEMINI_API_KEY via `x-goog-api-key` HTTP header (NEVER in URL query parameters).
 * - Does NOT log raw request payloads, prompts, CV/offer text, or raw API response bodies.
 * - Uses generic error messages with minimal technical status codes.
 */
/** Build the GenerateContent structured-output configuration using Google's REST shape. */
export function buildGeminiGenerationConfig(schema: Record<string, unknown>) {
  return {
    responseFormat: {
      text: {
        mimeType: "application/json",
        schema,
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
  // Use endpoint WITHOUT key query parameter to protect against URL log leaks
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const parts: Array<Record<string, unknown>> = [];

  if (request.fileInput) {
    const base64Data = request.fileInput.buffer.toString("base64");
    parts.push({
      inline_data: {
        mime_type: request.fileInput.mimeType,
        data: base64Data,
      },
    });
  }

  const textContent = request.systemPrompt
    ? `${request.systemPrompt}\n\n${request.userPrompt}`
    : request.userPrompt;

  parts.push({ text: textContent });

  const payload = {
    contents: [{ parts }],
    generationConfig: buildGeminiGenerationConfig(request.jsonSchema),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      safeLogError("GEMINI", `Erreur de communication API (HTTP ${res.status}).`);
      return null;
    }

    const resData = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      safeLogError("GEMINI", "Réponse vide de l'API Gemini.");
      return null;
    }

    const parsed = JSON.parse(rawText) as T;
    safeLogInfo("GEMINI", `Traitement IA terminé avec succès (modèle: ${model}).`);
    return parsed;
  } catch (err: unknown) {
    safeLogError("GEMINI", "Échec du traitement de la requête IA.");
    return null;
  }
}
