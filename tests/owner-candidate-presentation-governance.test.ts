import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file: string) => fs.readFileSync(file, "utf8");

test("candidate presentation server action is OWNER-only and audited atomically", () => {
  const action = read("app/espace/owner/candidatures/actions.ts");
  assert.match(action, /session\.user\.role !== "OWNER"/);
  assert.match(action, /prisma\.\$transaction\(async \(tx\) =>/);
  assert.match(action, /tx\.missionPresentation\.create/);
  assert.match(action, /tx\.application\.update/);
  assert.match(action, /tx\.recruitmentHistory\.create/);
  assert.match(action, /tx\.auditLog\.create/);
  assert.match(action, /actorRole: "OWNER"/);
});

test("enterprise job detail only loads applications already presented to that company", () => {
  const page = read("app/espace/entreprise/offres/[jobId]/page.tsx");
  assert.match(page, /applications:\s*\{\s*where:\s*\{\s*presentations:\s*\{\s*some:\s*\{\s*companyId: access\.companyId/);
  assert.doesNotMatch(page, /presentCandidateToCompany/);
  assert.doesNotMatch(page, /Présenter ce candidat/);
});

test("enterprise server actions no longer expose candidate presentation", () => {
  const actions = read("app/espace/entreprise/actions.ts");
  assert.doesNotMatch(actions, /export async function presentCandidateToCompany/);
  assert.match(actions, /export async function updateApplicationStatus/);
  assert.match(actions, /if \(!presentation\)/);
});

test("OWNER has a dedicated queue to decide candidate presentations", () => {
  const page = read("app/espace/owner/candidatures/page.tsx");
  const dashboard = read("app/espace/owner/page.tsx");
  assert.match(page, /session\.user\.role !== "OWNER"/);
  assert.match(page, /presentations: \{ none: \{\} \}/);
  assert.match(page, /action=\{presentCandidateToCompany\.bind\(null, application\.id\)\}/);
  assert.match(dashboard, /"\/espace\/owner\/candidatures"/);
});
