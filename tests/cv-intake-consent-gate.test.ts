import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("CV intake stores pending consent and never creates a user, candidate profile or invitation during import", () => {
  const route = read("app/api/owner/cv-intake/route.ts");
  assert.ok(route.includes('consent: { status: "PENDING"'));
  assert.ok(!route.includes("prisma.user.create"));
  assert.ok(!route.includes("prisma.candidateProfile.create"));
  assert.ok(!route.includes("sendEmail"));
  assert.ok(!route.includes("passwordResetToken.create"));
  assert.ok(!route.includes("prisma.job.findMany"));
});

test("CV intake consent is OWNER-only, evidence-backed, audited and revocable", () => {
  const route = read("app/api/owner/cv-intake/[id]/consent/route.ts");
  for (const fragment of ['role !== "OWNER"', "evidence.length < 10", "matching: { ...previousMatching", "previousConsent.status === \"REVOKED\"", "verifiedAt: verifiedAt.toISOString()", "verifiedByUserId: userId", "tx.auditLog.create", "CV_INTAKE_CONSENT_AUTHORIZED", "CV_INTAKE_CONSENT_REVOKED", 'status: "REJECTED"', 'consentStatus: "REVOKED"']) {
    assert.ok(route.includes(fragment), "missing consent control: " + fragment);
  }
});

test("Only authorized and analyzed CV intake records enter the provisional sourcing pool", () => {
  const ingest = read("lib/sourcing/ingest.ts");
  assert.ok(ingest.includes('status: "ANALYSE_OK", candidateId: null, matching: { path: ["consent", "status"], equals: "AUTHORIZED" }'));
  assert.ok(ingest.includes('consentStatus: "AUTHORIZED"'));
  assert.ok(ingest.includes('candidate.source === "PLATFORM_CV_INTAKE" && candidate.consentStatus !== "AUTHORIZED"'));
  assert.ok(ingest.includes("consentVerified: true"));
});

test("Legacy pending or revoked CV intake sourced candidates are excluded from matching and sourcing views", () => {
  const pipeline = read("lib/jobs/offer-pipeline.ts");
  assert.ok(pipeline.includes('source: { not: "PLATFORM_CV_INTAKE" }'));
  assert.ok(pipeline.includes('consentStatus: "AUTHORIZED"'));
  for (const path of ["app/espace/owner/sourcing/page.tsx", "app/espace/owner/sourcing/matching/page.tsx", "app/espace/owner/sourcing/qualification/page.tsx"]) {
    const page = read(path);
    assert.ok(page.includes('source: { not: "PLATFORM_CV_INTAKE" }'), "unauthorized CV filtering missing in " + path);
    assert.ok(page.includes('consentStatus: "AUTHORIZED"'), "consent authorization filter missing in " + path);
  }
  const actions = read("app/api/sourcing/candidate-actions/route.ts");
  assert.ok(actions.includes("CV_INTAKE_CONSENT_REQUIRED"));
});

test("Candidate account creation and invitation require explicit Owner action after consent", () => {
  const route = read("app/api/owner/cv-intake/invite/route.ts");
  assert.ok(route.includes('role !== "OWNER"'));
  assert.ok(route.includes('consent.status !== "AUTHORIZED"'));
  assert.ok(route.includes("tx.user.create"));
  assert.ok(route.includes("tx.candidateProfile.create"));
  assert.ok(route.includes("tx.candidateDocument.create"));
  assert.ok(route.includes("CV_INTAKE_LINKED_TO_CANDIDATE"));
  assert.ok(route.includes("CANDIDATE_INVITATION_SENT"));
  assert.ok(route.includes("invitationStatus: \"SENT\""));
  assert.ok(route.includes("invitationStatus === \"SENT\""));
  assert.ok(route.includes("promotedToCandidateId"));
});

test("CV intake UI exposes consent controls only to OWNER and gates invitations", () => {
  const api = read("app/api/owner/cv-intake/route.ts");
  const page = read("app/espace/owner/cv-intake/page.tsx");
  assert.ok(api.includes('canManageConsent: session?.user?.role === "OWNER"'));
  assert.ok(page.includes("canManageConsent"));
  assert.ok(page.includes("Valider l’autorisation"));
  assert.ok(page.includes("Révoquer l’autorisation"));
  assert.ok(page.includes('cv.consentStatus === "AUTHORIZED"'));
  assert.ok(page.includes("Aucun compte candidat ni invitation n’a été créé automatiquement."));
  assert.ok(page.includes("invitationStatus === \"SENT\""));
});

test("CV consent metadata uses the existing JSON column and introduces no database migration", () => {
  const schema = read("prisma/schema.prisma");
  const route = read("app/api/owner/cv-intake/[id]/consent/route.ts");
  assert.ok(!schema.includes('consentStatus     String          @default("PENDING")'));
  assert.ok(route.includes("matching: { ...previousMatching, consent:"));
  assert.ok(!fs.existsSync("prisma/migrations/20261106010000_cv_intake_consent_gate/migration.sql"));
});
