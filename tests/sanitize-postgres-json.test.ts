import test from "node:test";
import assert from "node:assert/strict";
import { sanitizePostgresJson } from "../lib/security/sanitize-postgres-json";

test("sanitizePostgresJson removes NUL characters recursively from parsed CV data", () => {
  const input = {
    headline: "Senior\u0000 Engineer",
    skills: ["TypeScript", "PostgreSQL\u0000"],
    nested: { summary: "Experience\u0000 details", "\u0000key": "value" },
    unchanged: 7,
  };
  const result = sanitizePostgresJson(input);
  assert.deepEqual(result, {
    headline: "Senior Engineer",
    skills: ["TypeScript", "PostgreSQL"],
    nested: { summary: "Experience details", key: "value" },
    unchanged: 7,
  });
});

test("sanitizePostgresJson preserves nulls, booleans, numbers and original binary buffers", () => {
  const bytes = Buffer.from([0, 1, 2, 255]);
  const result = sanitizePostgresJson({ bytes, missing: null, enabled: true, count: 3 });
  assert.deepEqual(result.bytes, bytes);
  assert.equal(result.missing, null);
  assert.equal(result.enabled, true);
  assert.equal(result.count, 3);
});
