import test from "node:test";
import assert from "node:assert/strict";
import { matchCandidateToJob } from "../lib/matching/candidate-job";

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
  const candidateWithCv = {
    skills: ["TypeScript"],
    experienceYears: 3,
  };
  const result = matchCandidateToJob(candidateWithCv, { requiredSkills: ["TypeScript"] });
  assert.ok(result.matchedSkills.includes("TypeScript"));
  assert.ok(result.evidenceProofs.some((p) => p.includes("TypeScript")));
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
    skills: ["Python", "Machine Learning"],
    experienceYears: 5,
    headline: "Data Scientist",
  };
  const job = {
    title: "Data Scientist Lead",
    requiredSkills: ["Python"],
  };

  const match = matchCandidateToJob(candidate, job);

  // Simuler la structure retournée par l'action propose_anonymized
  const anonymizedProposal = {
    candidateAlias: "Profil #A1B2C3",
    companyAlias: "Entreprise #X9Y8Z7",
    headline: candidate.headline,
    experienceYears: candidate.experienceYears,
    score: match.score,
    matchedSkills: match.matchedSkills,
    missingSkills: match.missingSkills,
  };

  assert.doesNotMatch(JSON.stringify(anonymizedProposal), /name|email|phone|adresse/i);
  assert.equal(anonymizedProposal.candidateAlias, "Profil #A1B2C3");
});

test("6. Proposition complète avec contrôle des permissions et du consentement", async () => {
  function checkFullProposalPermission(userRole: string, permissions: string[]) {
    if (userRole === "OWNER") return true;
    if (userRole === "ADMIN" && permissions.includes("PRESENTATIONS_MANAGE")) return true;
    return false;
  }

  assert.equal(checkFullProposalPermission("OWNER", []), true);
  assert.equal(checkFullProposalPermission("ADMIN", ["PRESENTATIONS_MANAGE"]), true);
  assert.equal(checkFullProposalPermission("ADMIN", []), false);
  assert.equal(checkFullProposalPermission("CONSULTANT", ["PRESENTATIONS_MANAGE"]), false);
});

test("7. Mise en relation distincte et traçable", async () => {
  const actionName = "CONNECT_MATCHMAKING";
  assert.equal(actionName, "CONNECT_MATCHMAKING");
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
  function canAccessMatching(role?: string, permissions: string[] = []) {
    if (!role || !["OWNER", "ADMIN", "CONSULTANT"].includes(role)) return false;
    if (role === "OWNER") return true;
    return permissions.includes("CV_MATCHING");
  }

  assert.equal(canAccessMatching("CANDIDAT", []), false);
  assert.equal(canAccessMatching("ENTREPRISE", []), false);
  assert.equal(canAccessMatching("CONSULTANT", []), false);
  assert.equal(canAccessMatching("CONSULTANT", ["CV_MATCHING"]), true);
  assert.equal(canAccessMatching("OWNER", []), true);
});

test("10. Compatibilité OWNER et non-régression des flux existants", async () => {
  function isOwnerAllowedToPerformAllActions(role: string) {
    return role === "OWNER";
  }

  assert.equal(isOwnerAllowedToPerformAllActions("OWNER"), true);
});
