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

test("CV intake consent is restricted to OWNER/ADMIN/CONSULTANT with CV_INTAKE permission, evidence-backed, audited and revocable", () => {
  const route = read("app/api/owner/cv-intake/[id]/consent/route.ts");
  assert.ok(route.includes('["OWNER", "ADMIN", "CONSULTANT"].includes(role)'));
  assert.ok(route.includes('hasPermission(userId, role, "CV_INTAKE")'));
  assert.ok(route.includes("actorRole: role"));
  for (const fragment of ["evidence.length < 10", "previousConsent.status === \"REVOKED\"", "verifiedAt: verifiedAt.toISOString()", "verifiedByUserId: userId", "tx.auditLog.create", "CV_INTAKE_CONSENT_AUTHORIZED", "CV_INTAKE_CONSENT_REVOKED", 'status: "REJECTED"', 'consentStatus: "REVOKED"', "MANUAL_CV_IMPORT", 'status: "SUSPENDED"', "createHash(", "passwordResetToken.deleteMany", "invitationTokenHash"]) {
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

test("local CV reprocessing preserves consent and defers all matching until authorization", () => {
  const route = read("app/api/owner/cv-intake/reprocess/route.ts");
  assert.ok(route.includes("matching: { ...matching, suggestedMatches"));
  assert.ok(route.includes('consent.status !== "AUTHORIZED"'));
  assert.ok(route.indexOf('consent.status !== "AUTHORIZED"') < route.indexOf("extractTextFromCvBuffer("), "consent must be checked before document extraction");
  assert.ok(route.includes('matching: { path: ["consent", "status"], equals: "AUTHORIZED" }'), "final analysis writes must be guarded against concurrent revocation");
  assert.ok(route.includes('latestConsent.status !== "AUTHORIZED"'), "reprocessing must re-read consent after taking the intake row lock");
  assert.ok(route.includes("ingestAnalyzedCvIntakes(userId, 1, [record.id])"));
  assert.ok(!route.includes("prisma.job.findMany"));
  assert.ok(!route.includes("function scoreJob("));
});

test("sourcing ingestion serializes with revocation and cannot restore matches after consent is revoked", () => {
  const ingest = read("lib/sourcing/ingest.ts");
  assert.ok(ingest.includes('matching: { path: ["consent", "status"], equals: "AUTHORIZED" }'));
  assert.ok(ingest.includes("const locked = await tx.cvIntake.updateMany"));
  assert.ok(ingest.includes('consentStatus: "AUTHORIZED" }\n      : { id: candidate.id }'));
  const consent = read("app/api/owner/cv-intake/[id]/consent/route.ts");
  assert.ok(consent.includes("matchingScore: 0"));
  assert.ok(consent.includes("matchedOffers: []"));
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
  assert.ok(route.includes("invitationTokenHash: tokenHash"));
  assert.ok(route.includes("CV_INTAKE_LINKED_TO_CANDIDATE"));
  assert.ok(route.includes("CANDIDATE_INVITATION_SENT"));
  assert.ok(route.includes("invitationStatus: \"SENT\""));
  assert.ok(route.includes("invitationStatus === \"SENT\""));
  assert.ok(route.includes("promotedToCandidateId"));
});

test("CV intake UI exposes consent controls only to users with CV_INTAKE permission and gates invitations", () => {
  const api = read("app/api/owner/cv-intake/route.ts");
  const page = read("app/espace/owner/cv-intake/page.tsx");
  assert.ok(api.includes('const canManageConsent = await hasPermission(userId, session?.user?.role || undefined, "CV_INTAKE")'));
  assert.ok(api.includes("canManageConsent,"));
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
  assert.ok(route.includes("consent: { status, evidence, verifiedAt: verifiedAt.toISOString()"));
  assert.ok(route.includes("data: { matching: nextMatching as Prisma.InputJsonValue }"));
  assert.ok(!fs.existsSync("prisma/migrations/20261106010000_cv_intake_consent_gate/migration.sql"));
});

test("CV intake audit records the authenticated actor role instead of attributing every import to OWNER", () => {
  const route = read("app/api/owner/cv-intake/route.ts");
  assert.ok(route.includes("const userRole = typeof session?.user?.role === \"string\" ? session.user.role : \"\""));
  assert.ok(route.includes("senderRole: userRole"));
  assert.ok(route.includes("actorRole: userRole"));
  assert.ok(route.includes("authorRole: userRole"));
  assert.ok(!route.includes('senderRole: "OWNER"'));
  assert.ok(!route.includes('actorRole: "OWNER"'));
});
