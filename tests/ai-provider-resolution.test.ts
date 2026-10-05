import test from "node:test";
import assert from "node:assert/strict";
import { getActiveAiProvider } from "@/lib/ai/client";

const original = {
  provider: process.env.AI_PROVIDER,
  gemini: process.env.GEMINI_API_KEY,
  openai: process.env.OPENAI_API_KEY,
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
