import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePrivacyGuardrails, safeSanitizeLogMessage } from "../lib/ai/privacy";
import { executeAiStructuredTask, getActiveAiProvider } from "../lib/ai/client";
import { analyzeCvDocument } from "../lib/cv/analyzer";
import { analyzeJobOffer } from "../lib/jobs/analyzer";
import { analyzeExternalOffer } from "../lib/sourcing/offer-analyzer";

test("Privacy Guardrails: Gemini strictly blocks real CVs before network call", async () => {
  const result = evaluatePrivacyGuardrails("gemini", {
    classification: "REAL_CV",
  });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /CV réels/i);

  // Direct test via executeAiStructuredTask when AI_PROVIDER=gemini
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    const response = await executeAiStructuredTask({
      context: { classification: "REAL_CV" },
      jsonSchemaName: "test_schema",
      jsonSchema: { type: "object" },
      userPrompt: "Contenu d'un CV réel avec nom, prénom et coordonnées",
    });

    assert.equal(response.providerUsed, "gemini");
    assert.equal(response.data, null);
    assert.match(response.blockedReason || "", /CV réels/i);
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }
});

test("Privacy Guardrails: Gemini strictly blocks candidate private data and PII before network call", async () => {
  const resultPii = evaluatePrivacyGuardrails("gemini", {
    classification: "CANDIDATE_DATA",
    containsPii: true,
  });
  assert.equal(resultPii.allowed, false);
  assert.match(resultPii.reason, /données candidates ou personnelles/i);
});

test("Privacy Guardrails: Pseudonymized candidate data is STILL blocked for Gemini", async () => {
  const resultPseudo = evaluatePrivacyGuardrails("gemini", {
    classification: "CANDIDATE_DATA",
    isPseudonymized: true,
  });
  assert.equal(resultPseudo.allowed, false);
  assert.match(resultPseudo.reason, /pseudonymisation n'est pas considérée comme une anonymisation suffisante/i);
});

test("Privacy Guardrails: Gemini strictly blocks confidential enterprise data before network call", async () => {
  const resultConfidential = evaluatePrivacyGuardrails("gemini", {
    classification: "CONFIDENTIAL_ENTERPRISE",
    isConfidentialEnterprise: true,
  });
  assert.equal(resultConfidential.allowed, false);
  assert.match(resultConfidential.reason, /données confidentielles d'entreprise/i);
});

test("Privacy Guardrails: Gemini allows non-confidential public offers and mock data", () => {
  const resultPublic = evaluatePrivacyGuardrails("gemini", {
    classification: "PUBLIC_OFFER",
  });
  assert.equal(resultPublic.allowed, true);

  const resultMock = evaluatePrivacyGuardrails("gemini", {
    classification: "MOCK_DATA",
    isMockData: true,
  });
  assert.equal(resultMock.allowed, true);
});

test("Privacy Guardrails: OpenAI provider preserves full capability for real candidate data", () => {
  const resultOpenAi = evaluatePrivacyGuardrails("openai", {
    classification: "REAL_CV",
  });
  assert.equal(resultOpenAi.allowed, true);
});

test("Sanitization & Logging: API keys, tokens, emails, and phone numbers are redacted", () => {
  const logWithKeys = "Erreur Gemini avec clé AIzaSy123456789012345678901234567890123 et mail candidat jean.dupont@gmail.com et tel +33612345678";
  const sanitized = safeSanitizeLogMessage(logWithKeys);

  assert.doesNotMatch(sanitized, /AIzaSy123456789012345678901234567890123/);
  assert.doesNotMatch(sanitized, /jean\.dupont@gmail\.com/);
  assert.doesNotMatch(sanitized, /\+33612345678/);

  assert.match(sanitized, /\[REDACTED_GEMINI_KEY\]/);
  assert.match(sanitized, /\[REDACTED_EMAIL\]/);
  assert.match(sanitized, /\[REDACTED_PHONE\]/);
});

test("Module Non-Regression: analyzeCvDocument blocks real CV when Gemini is forced", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    const res = await analyzeCvDocument({
      fileName: "cv_candidat.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("CV de Jean Dupont"),
      taxonomy: [],
    });

    assert.equal(res, null);
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }
});

test("Module Non-Regression: analyzeJobOffer blocks confidential enterprise job when Gemini is forced", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    const res = await analyzeJobOffer({
      title: "Directeur Stratégie Confidentielle",
      description: "Recrutement strictement confidentiel pour restructuration",
      taxonomy: [],
      isConfidentialEnterprise: true,
    });

    assert.equal(res, null);
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }
});
