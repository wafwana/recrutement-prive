import test from "node:test";
import assert from "node:assert/strict";
import { matchCandidateToJob } from "../lib/matching/candidate-job";

test("Brique B - Match candidate with strong skill and experience alignment", async () => {
  const candidate = {
    headline: "Directeur de Casino & Exploitation",
    skills: ["Gestion des jeux", "Machines à sous", "Management", "Sécurité casino", "Analyse financière"],
    experienceYears: 12,
    location: "Evian-les-Bains, France",
    country: "FR",
    primaryCategoryCode: "CASINOS_JEUX",
    subCategoryCodes: ["EXPLOITATION_JEUX"],
  };

  const job = {
    title: "Directeur Général Casino",
    requiredSkills: ["Gestion des jeux", "Machines à sous", "Management"],
    requiredExperienceYears: 10,
    location: "Genève, Suisse",
    country: "CH",
    categoryCode: "CASINOS_JEUX",
    subCategoryCode: "EXPLOITATION_JEUX",
  };

  const result = matchCandidateToJob(candidate, job);

  assert.ok(result.score >= 80, `Score should be high (>=80), got ${result.score}`);
  assert.equal(result.matchedSkills.length, 3, "All 3 required skills should match");
  assert.equal(result.missingSkills.length, 0, "No required skills should be missing");
  assert.equal(result.categoryMatchLevel, "EXACT_SUBCATEGORY");
  assert.equal(result.countryFit, "FRANCE_SWITZERLAND_CROSS_BORDER");

  assert.ok(result.criteriaDetails.length >= 3, "Criteria breakdown details should be present");
  assert.ok(result.evidenceProofs.some((p) => p.includes("Directeur de Casino")), "Evidence should quote candidate headline");
  assert.ok(result.strengths.some((s) => s.includes("Seuil d'expérience satisfait")), "Strengths should report satisfied experience");
  assert.ok(result.risksAndReserves.some((r) => r.includes("transfrontalière")), "Risks should highlight cross-border mobility");
  assert.ok(result.calculatedAt, "calculatedAt timestamp must be present");
});

test("Brique B - Partial match with missing skills and experience gap", async () => {
  const candidate = {
    headline: "Assistant Chef de Caisse",
    skills: ["Caisse", "Accueil"],
    experienceYears: 2,
    location: "Paris, France",
    country: "FR",
    primaryCategoryCode: "CASINOS_JEUX",
    subCategoryCodes: ["CAISSE"],
  };

  const job = {
    title: "Chef de Caisse Senior",
    requiredSkills: ["Caisse", "Gestion des jeux", "Audit comptable", "Management"],
    requiredExperienceYears: 8,
    location: "Lyon, France",
    country: "FR",
    categoryCode: "CASINOS_JEUX",
    subCategoryCode: "CAISSE",
  };

  const result = matchCandidateToJob(candidate, job);

  assert.ok(result.score < 70, `Score should reflect partial match (<70), got ${result.score}`);
  assert.equal(result.matchedSkills.length, 1, "Only 1 skill ('Caisse') should match");
  assert.ok(result.missingSkills.includes("Audit comptable"), "Missing skill 'Audit comptable' must be reported");
  assert.equal(result.countryFit, "SAME_COUNTRY");

  const missingSkillCriteria = result.criteriaDetails.filter((c) => c.status === "MISSING");
  assert.ok(missingSkillCriteria.length >= 3, "Missing skills must be marked as MISSING in criteria details");

  const experienceCriterion = result.criteriaDetails.find((c) => c.kind === "EXPERIENCE");
  assert.equal(experienceCriterion?.status, "PARTIALLY_SATISFIED");
});

test("Brique B - Pure facts-only check: zero invented data", async () => {
  const candidate = {
    headline: null,
    skills: [],
    experienceYears: null,
    location: null,
    country: null,
  };

  const job = {
    title: "Responsable Sécurité",
    requiredSkills: ["Vidéosurveillance"],
    requiredExperienceYears: 5,
    country: "FR",
  };

  const result = matchCandidateToJob(candidate, job);

  assert.equal(result.matchedSkills.length, 0);
  assert.equal(result.missingSkills.length, 1);
  assert.equal(result.missingSkills[0], "Vidéosurveillance");
  assert.equal(result.countryFit, "UNKNOWN");
  assert.ok(result.risksAndReserves.some((r) => r.includes("non documenté")), "Gap in experience should be explicitly flagged in risks");
});
