import { describe, expect, it } from "vitest";
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
    expect(result.countryFit).toBe("FRANCE_SWITZERLAND_CROSS_BORDER");
    expect(result.reasons.join(" ")).toContain("permis/autorisation de travail");
    expect(result.score).toBeGreaterThan(0);
  });

  it("normalizes country aliases", () => {
    expect(matchCandidateToJob({ ...candidate, country: "FR" }, { ...swissJob, country: "CH" }).countryFit)
      .toBe("FRANCE_SWITZERLAND_CROSS_BORDER");
  });

  it("flags missing country data for manual verification", () => {
    expect(matchCandidateToJob({ ...candidate, country: null }, { ...swissJob, country: null }).countryFit)
      .toBe("UNKNOWN");
  });

  it("does not flag a same-country match as cross-border", () => {
    expect(matchCandidateToJob(candidate, { ...swissJob, country: "France" }).countryFit).toBe("SAME_COUNTRY");
  });
});
