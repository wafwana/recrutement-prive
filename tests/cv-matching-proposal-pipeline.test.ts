import assert from "node:assert/strict";
import test from "node:test";
import { getActiveAiProvider } from "@/lib/ai/client";
import { analyzeCvDocument } from "@/lib/cv/analyzer";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";
import { isIdentityUnlocked } from "@/lib/mission-lock";

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
