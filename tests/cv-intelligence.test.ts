import test from "node:test";
import assert from "node:assert/strict";
import cases from "./fixtures/cv-test-cases.json";
import { buildCvFolderPath } from "../lib/cv/organization";
import { matchCandidateToJob } from "../lib/matching/candidate-job";

test("les CV test sont classés dans les dossiers métier attendus", () => {
  const year = 2026;
  for (const item of cases) {
    const folder = buildCvFolderPath(item.primaryCategoryCode, item.subCategoryCode, year);
    assert.equal(folder, `${item.expectedFolderPrefix}${year}`);
  }
});

test("un CV peut être rematché sur une offre différente de son origine", () => {
  const cv = cases[0];
  const result = matchCandidateToJob(
    {
      skills: cv.skills,
      experienceYears: 8,
      headline: cv.profile,
      bio: "Développement logiciel et applications web",
      location: "Paris",
      country: "France",
      primaryCategoryCode: cv.primaryCategoryCode,
      subCategoryCodes: [cv.subCategoryCode],
    },
    {
      title: "Ingénieur Data / IA",
      description: "Développement Python et traitement de données",
      requiredSkills: ["Python", "PostgreSQL"],
      requiredExperienceYears: 5,
      categoryCode: "IT",
      subCategoryCode: "DATA_IA",
    },
  );

  assert.equal(result.matchedSkills.length, 2);
  assert.equal(result.categoryMatchLevel, "PARENT_CATEGORY");
  assert.ok(result.score > 50);
});
