import test from "node:test";
import assert from "node:assert/strict";
import { getActiveAiProvider } from "@/lib/ai/client";
import { buildGeminiGenerationConfig, getGeminiModel, callGeminiStructured, GEMINI_REQUEST_TIMEOUT_MS } from "@/lib/ai/gemini";

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


test("Gemini structured output uses the documented GenerateContent REST envelope", () => {
  const schema = {
    type: "object",
    properties: { years: { type: ["number", "null"] } },
    required: ["years"],
  };
  assert.deepEqual(buildGeminiGenerationConfig(schema), {
    responseMimeType: "application/json",
    responseJsonSchema: schema,
  });
});


test("Gemini structured calls use a bounded request timeout with synthetic data", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  let signalProvided = false;
  process.env.GEMINI_API_KEY = "synthetic-test-key";
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    signalProvided = init?.signal instanceof AbortSignal;
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ ok: true }) }] } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const result = await callGeminiStructured<{ ok: boolean }>({
      userPrompt: "Synthetic test only.",
      jsonSchemaName: "synthetic_timeout_test",
      jsonSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
      context: { classification: "MOCK_DATA", isMockData: true },
    });
    assert.deepEqual(result, { ok: true });
    assert.equal(GEMINI_REQUEST_TIMEOUT_MS, 15_000);
    assert.equal(signalProvided, true);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});


test("Gemini retries one transient HTTP 503 and succeeds without exposing request data", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalProvider = process.env.AI_PROVIDER;
  let calls = 0;
  process.env.GEMINI_API_KEY = "synthetic-test-key";
  globalThis.fetch = (async () => {
    calls++;
    if (calls === 1) return new Response("unavailable", { status: 503 });
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ ok: true }) }] } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const result = await callGeminiStructured<{ ok: boolean }>({
      userPrompt: "Synthetic retry test only.",
      jsonSchemaName: "synthetic_retry_test",
      jsonSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
      context: { classification: "MOCK_DATA", isMockData: true },
    });
    assert.deepEqual(result, { ok: true });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey;
    if (originalProvider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = originalProvider;
  }
});

test("Gemini defers instead of retrying when Retry-After exceeds the bounded budget", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  let calls = 0;
  process.env.GEMINI_API_KEY = "synthetic-test-key";
  globalThis.fetch = (async () => {
    calls++;
    return new Response("temporarily unavailable", { status: 503, headers: { "retry-after": "5" } });
  }) as typeof fetch;
  try {
    const result = await callGeminiStructured<{ ok: boolean }>({
      userPrompt: "Synthetic deferred retry test only.",
      jsonSchemaName: "synthetic_deferred_retry_test",
      jsonSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
      context: { classification: "MOCK_DATA", isMockData: true },
    });
    assert.equal(result, null);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey;
  }
});
