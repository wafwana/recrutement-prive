import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

test("enterprise offer page exposes a real confidential presentation action", () => {
  const page = fs.readFileSync(path.join(root, "app/espace/entreprise/offres/[jobId]/page.tsx"), "utf8");
  const actions = fs.readFileSync(path.join(root, "app/espace/entreprise/actions.ts"), "utf8");
  assert.match(page, /presentCandidateToCompany\.bind\(null, application\.id\)/);
  assert.match(actions, /anonymousMessagingEnabled: true/);
  assert.match(actions, /candidateUserId: existing\.candidate\.userId/);
  assert.match(actions, /action: "CANDIDATE_PRESENTED"/);
});
