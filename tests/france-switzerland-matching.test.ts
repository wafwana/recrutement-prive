import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchCandidateToJob } from "../lib/matching/candidate-job";

const candidate = {
  country: "France",
  location: "Lille",
  skills: ["Excel", "Gestion de projet"],
  experienceYears: 5,
  headline: "Responsable opérations",
  bio: "Gestion de projet et coordination",
  primaryCategoryCode: "OPERATIONS",
  subCategoryCodes: [],
};

const swissJob = {
  country: "Suisse",
  location: "Genève",
  requiredSkills: ["Excel"],
  requiredExperienceYears: 3,
  title: "Responsable opérations",
  description: "Gestion de projet",
  categoryCode: "OPERATIONS",
};

describe("France–Switzerland cross-border matching", () => {
  it("flags France candidate / Swiss company without changing the skill score or assuming eligibility", () => {
    const result = matchCandidateToJob(candidate, swissJob);
    assert.equal(result.countryFit, "FRANCE_SWITZERLAND_CROSS_BORDER");
    assert.ok(result.reasons.join(" ").includes("permis/autorisation de travail"));
    assert.ok(result.score > 0);
  });

  it("detects country when a sourced profile only has a combined location field", () => {
    const result = matchCandidateToJob({ ...candidate, country: undefined, location: "Lille, France" }, { ...swissJob, country: "CH" });
    expect(result.countryFit).toBe("FRANCE_SWITZERLAND_CROSS_BORDER");
  });

  it("normalizes country aliases", () => {
    assert.equal(matchCandidateToJob({ ...candidate, country: "FR" }, { ...swissJob, country: "CH" }).countryFit, "FRANCE_SWITZERLAND_CROSS_BORDER");
  });

  it("flags missing country data for manual verification", () => {
    assert.equal(matchCandidateToJob({ ...candidate, country: null }, { ...swissJob, country: null }).countryFit, "UNKNOWN");
  });

  it("does not flag a same-country match as cross-border", () => {
    assert.equal(matchCandidateToJob(candidate, { ...swissJob, country: "France" }).countryFit, "SAME_COUNTRY");
  });
});
