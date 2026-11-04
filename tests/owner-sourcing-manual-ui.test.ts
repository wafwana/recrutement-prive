import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(file), "utf8");

test("OWNER manual sourcing UI prevents duplicate runs and distinguishes outcomes without full reload", () => {
  const content = read("components/owner/CandidateSourcingClient.tsx");
  assert.match(content, /if \(runningRef\.current\) return;/);
  assert.match(content, /runningRef\.current = false;/);
  assert.match(content, /Collecte partielle/);
  assert.match(content, /Aucun profil extrait/);
  assert.match(content, /Collecte terminée/);
  assert.match(content, /Collecte réussie/);
  const handler = content.slice(content.indexOf("async function handleRunSourcing"), content.indexOf("async function handleCandidateAction"));
  assert.doesNotMatch(handler, /window\.location\.reload/);
});

test("candidate detail modal provides keyboard containment, Escape, focus restoration and ARIA", () => {
  const content = read("components/owner/CandidateSourcingClient.tsx");
  assert.match(content, /e\.key === "Escape"/);
  assert.match(content, /e\.key !== "Tab"/);
  assert.match(content, /e\.shiftKey/);
  assert.match(content, /lastTriggerElementRef\.current\?\.isConnected/);
  assert.match(content, /aria-modal="true"/);
  assert.match(content, /aria-labelledby="modal-candidate-detail-title"/);
  assert.match(content, /aria-describedby="modal-candidate-detail-desc"/);
  assert.match(content, /Les profils découverts ne sont jamais contactés automatiquement/);
});

test("candidate history API denies unauthenticated and unprivileged users and validates candidateId", async () => {
  const { GET } = await import("../app/api/sourcing/candidate-history/route");
  const { runWithTestSession } = await import("../auth");

  const anonymous = await GET(new Request("http://localhost/api/sourcing/candidate-history?candidateId=cand_1"));
  assert.equal(anonymous.status, 403);

  const adminWithoutPermission = await runWithTestSession(
    { user: { id: "admin-without-sourcing", role: "ADMIN" } },
    () => GET(new Request("http://localhost/api/sourcing/candidate-history?candidateId=cand_1")),
  );
  assert.equal(adminWithoutPermission.status, 403);

  const ownerMissingId = await runWithTestSession(
    { user: { id: "owner-test", role: "OWNER" } },
    () => GET(new Request("http://localhost/api/sourcing/candidate-history")),
  );
  assert.equal(ownerMissingId.status, 400);
});

test("candidate status and AuditLog writes share one Prisma transaction; UI requires server confirmation", () => {
  const route = read("app/api/sourcing/candidate-actions/route.ts");
  assert.match(route, /prisma\.\$transaction\(async \(tx\) =>/);
  assert.match(route, /tx\.sourcedCandidate\.update/);
  assert.match(route, /tx\.auditLog\.create/);

  const ui = read("components/owner/CandidateSourcingClient.tsx");
  assert.match(ui, /const confirmedStatus = typeof data\?\.candidate\?\.status === "string" \? data\.candidate\.status : null;/);
  assert.match(ui, /Le serveur n'a pas confirmé le statut du candidat\./);
  assert.doesNotMatch(ui, /action === "VALIDATE" \? "VALIDATED"/);
});
