import test from "node:test";
import assert from "node:assert/strict";
import { buildGeminiGenerationConfig, normalizeGeminiJsonSchema } from "../lib/ai/gemini";

test("Gemini structured output uses the documented GenerateContent REST JSON fields", () => {
  const schema = {
    type: "object",
    properties: { title: { type: "string" } },
    required: ["title"],
  };

  const config = buildGeminiGenerationConfig(schema);

  assert.deepEqual(config, {
    responseMimeType: "application/json",
    responseJsonSchema: schema,
  });
  assert.equal("responseFormat" in config, false);
});

test("Gemini schema normalizer converts nullable type unions into supported anyOf", () => {
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
