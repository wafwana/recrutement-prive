import test from "node:test";
import assert from "node:assert/strict";
import { callGeminiStructured } from "../lib/ai/gemini";

const request = {
  userPrompt: "Return a simple title",
  jsonSchemaName: "simple_title",
  context: { classification: "MOCK_DATA", isMockData: true },
  jsonSchema: {
    type: "object",
    properties: { title: { type: "string" } },
    required: ["title"],
  },
};

test("Gemini retries one HTTP 429 without Retry-After and returns the successful response", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) return new Response("rate limited", { status: 429 });
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ title: "OK" }) }] } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const result = await callGeminiStructured<{ title: string }>(request);
    assert.deepEqual(result, { title: "OK" });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});

test("Gemini retries one transient network failure and then succeeds", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) throw new TypeError("network unavailable");
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ title: "Recovered" }) }] } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const result = await callGeminiStructured<{ title: string }>(request);
    assert.deepEqual(result, { title: "Recovered" });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});
