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

test("ADMIN cannot present a candidate on behalf of the OWNER", async () => {
  const { presentCandidateToCompany } = await import("../app/espace/owner/candidatures/actions");
  const { runWithTestSession } = await import("../auth");

  await assert.rejects(
    runWithTestSession(
      { user: { id: "admin-without-owner-authority", role: "ADMIN" } },
      () => presentCandidateToCompany("application-test"),
    ),
    /Seul l'OWNER peut présenter un candidat/,
  );
});

test("legacy presentation API rejects ADMIN and CONSULTANT even with delegated permission", async () => {
  const { POST } = await import("../app/api/consultant/presentations/route");
  const { runWithTestSession } = await import("../auth");
  const body = JSON.stringify({
    missionId: "mission-test",
    applicationId: "application-test",
    candidateId: "candidate-test",
    companyId: "company-test",
  });

  for (const role of ["ADMIN", "CONSULTANT"]) {
    const response = await runWithTestSession(
      { user: { id: `user-${role.toLowerCase()}`, role } },
      () => POST(new Request("http://localhost/api/consultant/presentations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      })),
    );
    assert.equal(response.status, 403);
    const payload = await response.json();
    assert.equal(payload.error, "Seul l'OWNER peut présenter un candidat.");
  }
});
