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

test("Gemini schema normalization preserves documented nullable type arrays", () => {
  const schema = {
    type: "object",
    properties: {
      years: { type: ["number", "null"] },
      language: { type: ["string", "null"] },
      skills: { type: "array", items: { type: "string" } },
    },
  };
  const normalized = normalizeGeminiJsonSchema(schema);

  assert.deepEqual(normalized, schema);
  assert.deepEqual(
    buildGeminiGenerationConfig(schema).responseJsonSchema,
    schema,
  );
});
