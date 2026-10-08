import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

test("public offer Gemini payload removes URLs, contact data and internal markers", () => {
  const source = fs.readFileSync(path.join(root, "lib/sourcing/offer-analyzer.ts"), "utf8");
  assert.match(source, /https\?:\\\/\\\/\[\^\\s\]\+/);
  assert.match(source, /companyName/);
  assert.match(source, /candidatures\?\|candidats\?\|postulants\?/);
  assert.match(source, /descriptionSummary: sanitizePublicOfferDescription/);
});