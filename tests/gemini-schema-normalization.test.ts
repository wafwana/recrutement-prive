import test from "node:test";
import assert from "node:assert/strict";
import { buildGeminiGenerationConfig, normalizeGeminiJsonSchema } from "../lib/ai/gemini";

test("Gemini structured output uses the documented REST responseFormat shape", () => {
  const config = buildGeminiGenerationConfig({
    type: "object",
    properties: { title: { type: "string" } },
    required: ["title"],
  });

  assert.deepEqual(config, {
    responseFormat: {
      text: {
        mimeType: "application/json",
        schema: {
          type: "object",
          properties: { title: { type: "string" } },
          required: ["title"],
        },
      },
    },
  });
});

test("Gemini schema normalizer converts nullable type unions into anyOf", () => {
  const normalized = normalizeGeminiJsonSchema({
    type: "object",
    properties: {
      years: { type: ["number", "null"] },
      language: { type: ["string", "null"] },
      skills: { type: "array", items: { type: "string" } },
    },
  });

  assert.deepEqual(normalized, {
    type: "object",
    properties: {
      years: { anyOf: [{ type: "number" }, { type: "null" }] },
      language: { anyOf: [{ type: "string" }, { type: "null" }] },
      skills: { type: "array", items: { type: "string" } },
    },
  });
});
