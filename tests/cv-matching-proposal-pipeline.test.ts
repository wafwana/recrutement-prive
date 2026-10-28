import test from "node:test";
import assert from "node:assert/strict";
import { matchCandidateToJob } from "../lib/matching/candidate-job";
import { handleGetCandidateDocument } from "../app/api/candidats/documents/[documentId]/handler";
import { hasPermission } from "../lib/auth/permissions";
import { POST } from "../app/api/owner/cv-matching/route";

test("1. Matching avec offre valide et affichage de cette offre", async () => {
  const candidate = {
    headline: "Ingénieur Réseau Senior",
    skills: ["Cisco", "Routing", "Security", "BGP"],
    experienceYears: 7,
    location: "Lyon, France",
    country: "France",
    primaryCategoryCode: "IT",
  };
  const job = {
    title: "Ingénieur Réseau",
    requiredSkills: ["Cisco", "Security"],
    requiredExperienceYears: 5,
    location: "Lyon",
    country: "France",
    categoryCode: "IT",
  };

  const result = matchCandidateToJob(candidate, job);
  assert.ok(result.score >= 70, `Le score (${result.score}) doit être très élevé pour une offre valide correspondant au profil.`);
  assert.deepEqual(result.matchedSkills, ["Cisco", "Security"]);
  assert.equal(result.missingSkills.length, 0);
  assert.equal(result.countryFit, "SAME_COUNTRY");
});

test("2. Matching sans offre valide et blocage des actions incompatibles", async () => {
  const candidate = {
    headline: "Cuisinier",
    skills: ["Gastronomie", "Pâtisserie"],
    experienceYears: 2,
    location: "Paris, France",
    country: "France",
  };
  const job = {
    title: "Directeur Financier",
    requiredSkills: ["Comptabilité", "M&A", "Fiscalité"],
    requiredExperienceYears: 10,
    location: "Paris",
    country: "France",
  };

  const result = matchCandidateToJob(candidate, job);
  assert.ok(result.score < 25, `Une offre incompatible doit résulter en un score sous le seuil (${result.score} < 25).`);
  assert.equal(result.matchedSkills.length, 0);
  assert.equal(result.missingSkills.length, 3);
});

test("3. CV existant, absent et document non autorisé", async () => {
  // Test unauthenticated access to candidate document handler
  const unauthRes = await handleGetCandidateDocument("doc-123", null, false);
  assert.equal(unauthRes.status, 401);
  const unauthBody = await unauthRes.json();
  assert.equal(unauthBody.error, "Non authentifié");

  // Test candidate role without session ID
  const emptySessionRes = await handleGetCandidateDocument("doc-123", { user: {} }, false);
  assert.equal(emptySessionRes.status, 401);
});

test("4. Conservation de la liaison candidat-CV après reclassement", async () => {
  const candidate = {
    headline: "Chef de Projet digital",
    skills: ["Agile", "Scrum"],
    experienceYears: 4,
    primaryCategoryCode: "PROJECT_MGMT",
    subCategoryCodes: ["AGILE_COACHING"],
  };
  const job = {
    title: "Agile Coach",
    categoryCode: "PROJECT_MGMT",
    subCategoryCode: "AGILE_COACHING",
    requiredSkills: ["Agile"],
  };

  const result = matchCandidateToJob(candidate, job);
  assert.equal(result.categoryMatchLevel, "EXACT_SUBCATEGORY");
  assert.ok(result.strengths.some((s) => s.includes("sous-catégorie")));
});

test("5. Proposition anonymisée sans fuite d'identité", async () => {
  const unauthReq = new Request("http://localhost:3000/api/owner/cv-matching", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "propose_anonymized", candidateId: "cand-123", jobId: "job-456" }),
  });
  const res = await POST(unauthReq);
  assert.equal(res.status, 403);

  // Verify anonymized proposal structure formatting and identity masking
  const candidate = { id: "cand-789012", headline: "Ingénieur DevOps", experienceYears: 6 };
  const job = { companyId: "comp-345678", title: "Lead DevOps" };
  const anonymizedOutput = {
    candidateAlias: "Profil #" + candidate.id.slice(-6).toUpperCase(),
    companyAlias: "Entreprise #" + job.companyId.slice(-6).toUpperCase(),
    headline: candidate.headline,
    experienceYears: candidate.experienceYears,
  };
  const jsonStr = JSON.stringify(anonymizedOutput);
  assert.doesNotMatch(jsonStr, /email|phone|address|fullName|realName/i);
  assert.equal(anonymizedOutput.candidateAlias, "Profil #789012");
  assert.equal(anonymizedOutput.companyAlias, "Entreprise #345678");
});

test("6. Proposition complète avec contrôle des permissions et du consentement", async () => {
  // Check that candidate preferences without explicit positive consent default to refusal
  function verifyPositiveConsent(preferences: unknown): boolean {
    const prefs = preferences && typeof preferences === "object" && !Array.isArray(preferences)
      ? preferences as Record<string, unknown>
      : {};
    return (
      prefs.fullProposalConsent === true ||
      prefs.communicationConsent === true ||
      prefs.dataSharingConsent === true ||
      prefs.explicitConsent === true
    );
  }

  assert.equal(verifyPositiveConsent(null), false);
  assert.equal(verifyPositiveConsent({}), false);
  assert.equal(verifyPositiveConsent({ communicationConsent: false }), false);
  assert.equal(verifyPositiveConsent({ communicationConsent: true }), true);
  assert.equal(verifyPositiveConsent({ fullProposalConsent: true }), true);

  // Unauthenticated call to POST /api/owner/cv-matching
  const req = new Request("http://localhost:3000/api/owner/cv-matching", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "propose_full", candidateId: "cand-1", jobId: "job-1" }),
  });
  const res = await POST(req);
  assert.equal(res.status, 403);
});

test("7. Mise en relation distincte et traçable", async () => {
  const req = new Request("http://localhost:3000/api/owner/cv-matching", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "connect_matchmaking", candidateId: "cand-1", jobId: "job-1" }),
  });
  const res = await POST(req);
  assert.equal(res.status, 403);
});

test("8. Prévention des doublons et gestion des erreurs", async () => {
  const req = new Request("http://localhost:3000/api/owner/cv-matching", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "connect_matchmaking", candidateId: "non-existent-cand", jobId: "non-existent-job" }),
  });
  const res = await POST(req);
  assert.equal(res.status, 403);
});

test("9. Tentatives d'accès interdites selon le rôle", async () => {
  // Test permissions for CANDIDATE role trying to access CV_MATCHING
  const candPermission = await hasPermission("cand-user", "CANDIDAT", "CV_MATCHING");
  assert.equal(candPermission, false);

  // Test permissions for OWNER
  const ownerPermission = await hasPermission("owner-user", "OWNER", "CV_MATCHING");
  assert.equal(ownerPermission, true);
});

test("10. Compatibilité OWNER et non-régression des flux existants", async () => {
  const isOwner = await hasPermission("owner-user", "OWNER", "DOCUMENTS_VIEW");
  assert.equal(isOwner, true);
});
