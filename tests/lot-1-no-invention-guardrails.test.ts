import test from "node:test";
import assert from "node:assert/strict";
import { assistAndRefineCv } from "../lib/cv/assistant";
import { structureAndAssistJobOffer } from "../lib/jobs/offer-assistant";
import { identifyTargetCompaniesForUnmatchedCandidate } from "../lib/sourcing/enterprise-candidate-matches";

test("CV assistant does not fabricate summary, mission or professional identity", () => {
  const analysis = {
    headline: null, summary: null, improvedSummary: null, skills: [], experiences: [],
    experienceYears: null, primaryCategoryCode: null,
  } as never;
  const result = assistAndRefineCv({ analysis });
  assert.equal(result.improvedHeadline, "");
  assert.equal(result.improvedSummary, "");
  assert.deepEqual(result.structuredExperiences, []);
  assert.deepEqual(result.highlightedSkills, []);
});

test("job assistant does not invent default experience, French or desired soft skills", () => {
  const result = structureAndAssistJobOffer({ title: "Poste test", rawDescription: "Recherche profil motivé." });
  assert.equal(result.requiredExperienceYears, null);
  assert.deepEqual(result.languages, []);
  assert.deepEqual(result.desiredSkills, []);
  assert.doesNotMatch(result.structuredDescription, /Français|travail en équipe|adaptabilité|expérience confirmée/i);
});

test("unmatched-candidate sourcing never fabricates company prospects", () => {
  assert.deepEqual(identifyTargetCompaniesForUnmatchedCandidate({
    candidateId: "candidate-1", primaryCategoryCode: "FINANCE", skills: ["Audit"], declaredMobilityCountry: "France",
  }), []);
});
