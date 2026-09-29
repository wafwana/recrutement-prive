import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePrivacyGuardrails, safeSanitizeLogMessage, inspectContentForPrivacyRisks } from "../lib/ai/privacy";
import { executeAiStructuredTask } from "../lib/ai/client";
import { analyzeCvDocument } from "../lib/cv/analyzer";
import { analyzeJobOffer } from "../lib/jobs/analyzer";

test("Network Interception Test: Forbidden Gemini requests trigger 0 network calls (0 fetch invocations)", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  let fetchCallCount = 0;
  // Mock network client
  globalThis.fetch = (async (url: string | URL | Request) => {
    fetchCallCount++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    // 1. Real CV payload
    fetchCallCount = 0;
    const cvRes = await analyzeCvDocument({
      fileName: "cv_jean_dupont.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("Jean Dupont - Ingénieur Logiciel - email: jean.dupont@gmail.com - tel: 0612345678"),
      taxonomy: [],
    });
    assert.equal(cvRes, null);
    assert.equal(fetchCallCount, 0, "Network call was made for a real CV! Must be 0.");

    // 2. Candidate private data with PII
    fetchCallCount = 0;
    const piiRes = await executeAiStructuredTask({
      context: { classification: "PUBLIC_OFFER" }, // Attempting classification trick with PII text
      jsonSchemaName: "test_schema",
      jsonSchema: { type: "object" },
      userPrompt: "Offre d'emploi. Contact recrutement: sophie.martin@entreprise.fr - 0140506070",
    });
    assert.equal(piiRes.data, null);
    assert.equal(fetchCallCount, 0, "Network call was made for payload with PII! Must be 0.");

    // 3. Pseudonymized candidate data
    fetchCallCount = 0;
    const pseudoRes = await executeAiStructuredTask({
      context: { classification: "PUBLIC_OFFER", isPseudonymized: true },
      jsonSchemaName: "test_schema",
      jsonSchema: { type: "object" },
      userPrompt: "Profil Candidat A - Expérience anonymisée 10 ans en finance",
    });
    assert.equal(pseudoRes.data, null);
    assert.equal(fetchCallCount, 0, "Network call was made for pseudonymized candidate data! Must be 0.");

    // 4. Confidential enterprise job offer
    fetchCallCount = 0;
    const confRes = await analyzeJobOffer({
      title: "Directeur de Filiale",
      description: "Recrutement strictement confidentiel et secret pour restructuration interne",
      taxonomy: [],
      isConfidentialEnterprise: true,
    });
    assert.equal(confRes, null);
    assert.equal(fetchCallCount, 0, "Network call was made for confidential enterprise offer! Must be 0.");
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});

test("Network Interception Test: Authorized mock/public offer reaches network client", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  let fetchCallCount = 0;
  globalThis.fetch = (async (url: string | URL | Request) => {
    fetchCallCount++;
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    skills: ["TypeScript", "React"],
                    experienceYears: 5,
                    location: "Paris",
                    missionType: "CDI",
                    description: "Développeur Senior",
                    categoryCode: "IT",
                    subCategoryCode: "DEV",
                    summary: "Poste dev senior",
                    confidence: 0.9,
                  }),
                },
              ],
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }) as typeof globalThis.fetch;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    const res = await analyzeJobOffer({
      title: "Développeur Senior Fullstack",
      description: "Poste ouvert au public pour renforcer l'équipe technique.",
      location: "Paris",
      missionType: "CDI",
      taxonomy: [],
      isConfidentialEnterprise: false,
    });

    assert.notEqual(res, null);
    assert.equal(res?.location, "Paris");
    assert.equal(fetchCallCount, 1, "Authorized public job offer should reach network fetch exactly once.");
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});

test("Privacy Guardrails: Deep content inspection detects hidden PII & CV markers", () => {
  const inspection1 = inspectContentForPrivacyRisks("Coordonnées: contact@domaine.com / 06 12 34 56 78");
  assert.equal(inspection1.containsPii, true);

  const inspection2 = inspectContentForPrivacyRisks("Mon curriculum vitae présente mon parcours en ingénierie");
  assert.equal(inspection2.containsCandidateMarkers, true);

  const inspection3 = inspectContentForPrivacyRisks("Projet secret strictement confidentiel");
  assert.equal(inspection3.containsConfidentialEnterprise, true);

  const inspection4 = inspectContentForPrivacyRisks("Fiche Candidat A masqué");
  assert.equal(inspection4.containsPseudonymizationMarkers, true);
});

test("Sanitization & Logging: Redacts sensitive fields, keys, emails, and phone numbers", () => {
  const logMsg = "Clé AIzaSy123456789012345678901234567890123 email user@test.fr tel +33612345678";
  const sanitized = safeSanitizeLogMessage(logMsg);

  assert.doesNotMatch(sanitized, /AIzaSy123456789012345678901234567890123/);
  assert.doesNotMatch(sanitized, /user@test\.fr/);
  assert.doesNotMatch(sanitized, /\+33612345678/);

  assert.match(sanitized, /\[REDACTED_GEMINI_KEY\]/);
  assert.match(sanitized, /\[REDACTED_EMAIL\]/);
  assert.match(sanitized, /\[REDACTED_PHONE\]/);
});

test("OpenAI behavior remains completely untouched", () => {
  const openAiResult = evaluatePrivacyGuardrails("openai", {
    classification: "REAL_CV",
  });
  assert.equal(openAiResult.allowed, true);
});
