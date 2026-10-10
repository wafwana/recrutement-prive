import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

test("public offer Gemini payload is sanitized before execution", () => {
  const source = fs.readFileSync(path.join(root, "lib/sourcing/offer-analyzer.ts"), "utf8");
  assert.match(source, /sanitizePublicOfferDescription/);
  assert.match(source, /https\?:/);
  assert.match(source, /companyName/);
  assert.match(source, /descriptionSummary: sanitizePublicOfferDescription/);
  assert.match(source, /curriculum\\s\+vitae\|CV/);
});
