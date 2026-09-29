import OpenAI from "openai";
import { AiAnalysisResponse, AiProvider, AiStructuredRequest } from "./types";
import { evaluatePrivacyGuardrails, safeLogError } from "./privacy";
import { callGeminiStructured } from "./gemini";

/**
 * Resolves which AI provider to use.
 * Order of preference:
 * 1. Forced provider specified via AI_PROVIDER env ("openai" | "gemini")
 * 2. Default to "openai" if OPENAI_API_KEY is available
 * 3. Default to "gemini" if GEMINI_API_KEY is available
 */
export function getActiveAiProvider(): AiProvider | null {
  const forced = process.env.AI_PROVIDER?.toLowerCase() as AiProvider | undefined;
  if (forced === "gemini" || forced === "openai") {
    return forced;
  }
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }
  if (process.env.GEMINI_API_KEY) {
    return "gemini";
  }
  return null;
}

function buildOpenAiFileContent(fileInput: NonNullable<AiStructuredRequest["fileInput"]>) {
  const encodedFile = fileInput.buffer.toString("base64");
  if (fileInput.mimeType === "image/jpeg") {
    return {
      type: "input_image" as const,
      image_url: `data:image/jpeg;base64,${encodedFile}`,
      detail: "auto" as const,
    };
  }
  return {
    type: "input_file" as const,
    filename: fileInput.fileName,
    file_data: `data:${fileInput.mimeType};base64,${encodedFile}`,
  };
}

async function callOpenAiStructured<T>(request: AiStructuredRequest<T>): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });
  const model = request.modelOverride || process.env.OPENAI_CV_MODEL || "gpt-4.1-mini";

  const contentParts: Array<Record<string, unknown>> = [];

  if (request.fileInput) {
    contentParts.push(buildOpenAiFileContent(request.fileInput));
  }

  const promptText = request.systemPrompt
    ? `${request.systemPrompt}\n\n${request.userPrompt}`
    : request.userPrompt;

  contentParts.push({
    type: "input_text",
    text: promptText,
  });

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "user",
        content: contentParts as any,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: request.jsonSchemaName,
        strict: true,
        schema: request.jsonSchema as any,
      },
    },
  });

  if (!response.output_text) return null;
  return JSON.parse(response.output_text) as T;
}

/**
 * Main AI entrypoint that enforces pre-network privacy guardrails and centralized payload sanitization.
 */
export async function executeAiStructuredTask<T>(
  request: AiStructuredRequest<T>
): Promise<AiAnalysisResponse<T>> {
  const provider = getActiveAiProvider();
  if (!provider) {
    return {
      providerUsed: "openai",
      data: null,
      blockedReason: "Aucun fournisseur d'IA n'est configuré (OPENAI_API_KEY ou GEMINI_API_KEY absent).",
    };
  }

  // Combine system prompt and user prompt for deep content inspection
  const fullPayloadText = [request.systemPrompt, request.userPrompt].filter(Boolean).join("\n");
  const hasFileInput = Boolean(request.fileInput);

  const guardrailCheck = evaluatePrivacyGuardrails(
    provider,
    request.context,
    fullPayloadText,
    hasFileInput,
    request.geminiAllowedFields
  );

  if (!guardrailCheck.allowed) {
    safeLogError(
      "PRIVACY_GUARDRAIL",
      `Exécution IA bloquée pour le fournisseur ${provider}: ${guardrailCheck.reason}`
    );
    return {
      providerUsed: provider,
      data: null,
      blockedReason: guardrailCheck.reason,
    };
  }

  if (provider === "gemini") {
    // Override user prompt with sanitized minimal prompt if available
    const sanitizedRequest: AiStructuredRequest<T> = {
      ...request,
      userPrompt: guardrailCheck.sanitizedPrompt || request.userPrompt,
      systemPrompt: undefined, // Strip system prompt for Gemini
    };
    const data = await callGeminiStructured<T>(sanitizedRequest);
    return { providerUsed: "gemini", data };
  }

  const data = await callOpenAiStructured<T>(request);
  return { providerUsed: "openai", data };
}
