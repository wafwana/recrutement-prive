import test from "node:test";
import assert from "node:assert/strict";
import { getActiveAiProvider } from "@/lib/ai/client";
import { getGeminiModel, toGeminiResponseSchema } from "@/lib/ai/gemini";

const original = {
  provider: process.env.AI_PROVIDER,
  gemini: process.env.GEMINI_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL,
};

function resetEnv() {
  delete process.env.AI_PROVIDER;
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;
}

test.after(() => {
  if (original.provider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = original.provider;
  if (original.gemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = original.gemini;
  if (original.openai === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = original.openai;
  if (original.geminiModel === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = original.geminiModel;
});

test("AI provider resolution is fail-closed", () => {
  resetEnv();
  assert.equal(getActiveAiProvider(), null);

  process.env.OPENAI_API_KEY = "test-openai";
  assert.equal(getActiveAiProvider(), null);

  process.env.GEMINI_API_KEY = "test-gemini";
  assert.equal(getActiveAiProvider(), "gemini");

  process.env.AI_PROVIDER = "gemini";
  delete process.env.GEMINI_API_KEY;
  assert.equal(getActiveAiProvider(), null);

  process.env.GEMINI_API_KEY = "test-gemini";
  assert.equal(getActiveAiProvider(), "gemini");

  process.env.AI_PROVIDER = "openai";
  delete process.env.OPENAI_API_KEY;
  assert.equal(getActiveAiProvider(), null);

  process.env.OPENAI_API_KEY = "test-openai";
  assert.equal(getActiveAiProvider(), "openai");
});


test("Gemini uses a current economical default model and respects an explicit override", () => {
  delete process.env.GEMINI_MODEL;
  assert.equal(getGeminiModel(), "gemini-3.5-flash-lite");
  process.env.GEMINI_MODEL = "gemini-3.8-flash";
  assert.equal(getGeminiModel(), "gemini-3.8-flash");
});


test("Gemini response schema uses API-compatible types and nullable fields", () => {
  const normalized = toGeminiResponseSchema({
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      years: { type: ["number", "null"] },
      skills: { type: "array", items: { type: "string" } },
    },
    required: ["title", "years", "skills"],
  });
  assert.deepEqual(normalized, {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      years: { type: "NUMBER", nullable: true },
      skills: { type: "ARRAY", items: { type: "STRING" } },
    },
    required: ["title", "years", "skills"],
  });
});
