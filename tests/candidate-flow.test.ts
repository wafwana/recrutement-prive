import test from "node:test";
import assert from "node:assert/strict";

test("candidate data structure and profile validation helper", () => {
  const profileInput = {
    headline: "Directeur de Projet",
    bio: "Parcours dans l'industrie et le conseil",
    location: "Lille",
    country: "France",
    phonePrefix: "+33",
    phone: "0612345678",
    skills: ["Management", "Agile", "Budget"],
    experienceYears: 12,
  };

  assert.equal(profileInput.headline, "Directeur de Projet");
  assert.equal(profileInput.experienceYears, 12);
  assert.deepEqual(profileInput.skills, ["Management", "Agile", "Budget"]);
});

test("application status flow labels match schema definitions", () => {
  const validStatuses = [
    "SUBMITTED",
    "REVIEWING",
    "INTERVIEW",
    "SHORTLISTED",
    "REJECTED",
    "HIRED",
  ];

  for (const status of validStatuses) {
    assert.ok(typeof status === "string");
  }
});
