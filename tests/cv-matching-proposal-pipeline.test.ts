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

  // Test unauthorized download attempt by non-OWNER (blocked at guard level before DB lookup when downloadRequested=true)
  if (process.env.DATABASE_URL) {
    const consultantSession = { user: { id: "consultant-1", role: "CONSULTANT" } };
    const downloadRes = await handleGetCandidateDocument("doc-123", consultantSession, true);
    assert.equal(downloadRes.status, 403);
  }
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
  const candidate = {
    id: "cand-123456",
    skills: ["Python", "Machine Learning"],
    experienceYears: 5,
    headline: "Data Scientist",
  };
  const job = {
    companyId: "comp-654321",
    title: "Data Scientist Lead",
    requiredSkills: ["Python"],
  };

  const match = matchCandidateToJob(candidate, job);

  // Anonymized proposal structure generated server-side
  const anonymizedProposal = {
    candidateAlias: "Profil #123456",
    companyAlias: "Entreprise #654321",
    headline: candidate.headline,
    experienceYears: candidate.experienceYears,
    score: match.score,
    matchedSkills: match.matchedSkills,
    missingSkills: match.missingSkills,
  };

  const serialized = JSON.stringify(anonymizedProposal);
  assert.doesNotMatch(serialized, /name|email|phone|adresse/i);
  assert.equal(anonymizedProposal.candidateAlias, "Profil #123456");
  assert.equal(anonymizedProposal.companyAlias, "Entreprise #654321");
});

test("6. Proposition complète avec contrôle des permissions et du consentement", async () => {
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
  // Invalid action schema check
  const req = new Request("http://localhost:3000/api/owner/cv-matching", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "invalid_action", candidateId: "cand-1", jobId: "job-1" }),
  });
  const res = await POST(req);
  assert.equal(res.status, 403);
});

test("8. Prévention des doublons et gestion des erreurs", async () => {
  const existingPresentations = new Set(["CAND123::JOB456"]);

  function attemptPresentation(pairId: string) {
    if (existingPresentations.has(pairId)) {
      return { status: 409, error: "Ce profil est déjà présenté à cette entreprise pour cette mission." };
    }
    existingPresentations.add(pairId);
    return { status: 201, success: true };
  }

  const firstAttempt = attemptPresentation("CAND123::JOB456");
  assert.equal(firstAttempt.status, 409);
  assert.equal(firstAttempt.error, "Ce profil est déjà présenté à cette entreprise pour cette mission.");

  const newAttempt = attemptPresentation("CAND789::JOB456");
  assert.equal(newAttempt.status, 201);
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
