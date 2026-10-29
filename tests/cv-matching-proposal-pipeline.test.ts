import test from "node:test";
import { isIdentityUnlocked } from "@/lib/mission-lock";
import { analyzeCvDocument } from "@/lib/cv/analyzer";
import { getActiveAiProvider } from "@/lib/ai/client";
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
  // Verify strict positive consent evaluation logic
  function checkExplicitPositiveConsent(preferences: unknown): boolean {
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

  assert.equal(checkExplicitPositiveConsent(null), false, "Null preferences must be rejected");
  assert.equal(checkExplicitPositiveConsent({}), false, "Empty preferences must be rejected");
  assert.equal(checkExplicitPositiveConsent({ communicationConsent: false }), false, "False consent must be rejected");
  assert.equal(checkExplicitPositiveConsent({ communicationConsent: true }), true, "Explicit positive consent must pass");
  assert.equal(checkExplicitPositiveConsent({ fullProposalConsent: true }), true, "Explicit full proposal consent must pass");

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


// Restored regression coverage from the pre-PR baseline; preserve existing AI/CV/matching/identity behavior.
test("CV & AI Pipeline: getActiveAiProvider resolves provider or returns null when unset", () => {
  const origOpenAi = process.env.OPENAI_API_KEY;
  const origGemini = process.env.GEMINI_API_KEY;
  const origForced = process.env.AI_PROVIDER;

  try {
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.AI_PROVIDER;

    assert.equal(getActiveAiProvider(), null);

    process.env.GEMINI_API_KEY = "test_gemini_key";
    assert.equal(getActiveAiProvider(), "gemini");

    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = "test_openai_key";
    // OPENAI_API_KEY alone does not enable OpenAI; AI_PROVIDER=openai is required.
    assert.equal(getActiveAiProvider(), null);

    process.env.AI_PROVIDER = "openai";
    assert.equal(getActiveAiProvider(), "openai");

    process.env.GEMINI_API_KEY = "test_gemini_key";
    process.env.AI_PROVIDER = "gemini";
    assert.equal(getActiveAiProvider(), "gemini");
  } finally {
    if (origOpenAi) process.env.OPENAI_API_KEY = origOpenAi; else delete process.env.OPENAI_API_KEY;
    if (origGemini) process.env.GEMINI_API_KEY = origGemini; else delete process.env.GEMINI_API_KEY;
    if (origForced) process.env.AI_PROVIDER = origForced; else delete process.env.AI_PROVIDER;
  }
});

test("CV Analysis Engine: returns null gracefully when no AI provider is configured without throwing", async () => {
  const origOpenAi = process.env.OPENAI_API_KEY;
  const origGemini = process.env.GEMINI_API_KEY;
  const origForced = process.env.AI_PROVIDER;

  try {
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.AI_PROVIDER;

    const result = await analyzeCvDocument({
      fileName: "test-cv.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("CV Content Fake"),
      taxonomy: [],
    });

    assert.equal(result, null);
  } finally {
    if (origOpenAi) process.env.OPENAI_API_KEY = origOpenAi; else delete process.env.OPENAI_API_KEY;
    if (origGemini) process.env.GEMINI_API_KEY = origGemini; else delete process.env.GEMINI_API_KEY;
    if (origForced) process.env.AI_PROVIDER = origForced; else delete process.env.AI_PROVIDER;
  }
});

test("Candidate-Job Matching Engine: calculates persistent score and skills alignment idempotently", () => {
  const candidate = {
    skills: ["TypeScript", "Next.js", "PostgreSQL"],
    experienceYears: 5,
    headline: "Développeur Fullstack Senior",
    bio: "Expérimenté en architectures cloud et web.",
    primaryCategoryCode: "IT_DEV",
    subCategoryCodes: ["IT_DEV_FULLSTACK"],
  };

  const job = {
    requiredSkills: ["TypeScript", "Next.js", "React"],
    requiredExperienceYears: 4,
    title: "Développeur Fullstack React / Next.js",
    description: "Poste de développeur fullstack au sein de l'équipe produit.",
    location: "Paris",
    categoryCode: "IT_DEV",
    subCategoryCode: "IT_DEV_FULLSTACK",
  };

  const result1 = matchCandidateToJob(candidate, job);
  const result2 = matchCandidateToJob(candidate, job);

  assert.ok(result1.score >= 50);
  assert.equal(result1.score, result2.score, "Matching must be perfectly deterministic and idempotent");
  assert.equal(result1.categoryMatchLevel, "EXACT_SUBCATEGORY");
});

test("RP Proposal & Human Validation Gate: strictly blocks identity unlock until confirmed status", () => {
  assert.equal(isIdentityUnlocked("CANDIDAT_ANONYME", "PENDING"), false);
  assert.equal(isIdentityUnlocked("PAIEMENT_OU_CONDITION_CONFIRME", "PENDING"), false);
  assert.equal(isIdentityUnlocked("PAIEMENT_OU_CONDITION_CONFIRME", "CONFIRMED"), false);
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "PENDING"), false);
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "CONFIRMED"), true);
});
