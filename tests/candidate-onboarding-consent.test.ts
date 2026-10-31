import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("password reset does not imply or record candidate data-sharing consent", () => {
  const action = fs.readFileSync("app/reinitialisation-mot-de-passe/actions.ts", "utf8");

  assert.match(action, /passwordHash: newHash/);
  assert.match(action, /usedAt: now/);
  assert.doesNotMatch(action, /consentStatus\s*:/);
  assert.doesNotMatch(action, /consentAcceptedAt\s*:/);
  assert.doesNotMatch(action, /candidateProfile\.update/);
});
