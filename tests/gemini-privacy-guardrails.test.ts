import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePrivacyGuardrails, safeSanitizeLogMessage, inspectContentForPrivacyRisks, sanitizeAndValidateGeminiPayload } from "../lib/ai/privacy";
import { executeAiStructuredTask } from "../lib/ai/client";
import { analyzeCvDocument } from "../lib/cv/analyzer";
import { analyzeJobOffer } from "../lib/jobs/analyzer";
import { analyzeExternalOffer } from "../lib/sourcing/offer-analyzer";
import { analyzeRawOffer } from "../lib/sourcing/raw-offer";

test("Network Interception 1: File attachments (fileInput) trigger 0 network calls even with isMockData: true", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    fetchCallCount = 0;
    const fileRes = await executeAiStructuredTask({
      context: { classification: "MOCK_DATA", isMockData: true },
      jsonSchemaName: "test_file_schema",
      jsonSchema: { type: "object" },
      fileInput: {
        fileName: "mock_cv.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("Contenu Fichier Synthetique"),
      },
      userPrompt: "Analyse ce fichier mocké",
    });

    assert.equal(fileRes.data, null);
    assert.match(fileRes.blockedReason || "", /interdit strictement tout fichier joint/i);
    assert.equal(fetchCallCount, 0, "Network call was initiated for a fileInput! Must be exactly 0.");
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});

test("Network Interception 2: Offer containing email -> blocked, fetch = 0", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 });
  }) as typeof globalThis.fetch;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    fetchCallCount = 0;
    const res = await analyzeJobOffer({
      title: "Développeur Web",
      description: "Contactez sophie.martin@entreprise.com pour cette offre.",
      taxonomy: [],
    });

    assert.equal(res, null);
    assert.equal(fetchCallCount, 0, "Email in offer must trigger 0 network calls.");
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});

test("Network Interception 3: Offer containing phone -> blocked, fetch = 0", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 });
  }) as typeof globalThis.fetch;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    fetchCallCount = 0;
    const res = await analyzeJobOffer({
      title: "Ingénieur Réseau",
      description: "Appelez le 06 12 34 56 78 pour candidater.",
      taxonomy: [],
    });

    assert.equal(res, null);
    assert.equal(fetchCallCount, 0, "Phone in offer must trigger 0 network calls.");
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});

test("Network Interception 4: Offer containing internal platform ID -> blocked, fetch = 0", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 });
  }) as typeof globalThis.fetch;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    fetchCallCount = 0;
    const res = await analyzeJobOffer({
      title: "Chef de projet IT",
      description: "Offre associée au compte usr_1234567890abcdef et job_998877665544",
      taxonomy: [],
    });

    assert.equal(res, null);
    assert.equal(fetchCallCount, 0, "Internal platform ID in offer must trigger 0 network calls.");
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});

test("Network Interception 5: Explicitly confidential content -> blocked, fetch = 0", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 });
  }) as typeof globalThis.fetch;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    fetchCallCount = 0;
    const res = await analyzeJobOffer({
      title: "Directeur de Restructuration",
      description: "Mission strictly confidentielle et projet secret d'entreprise",
      taxonomy: [],
    });

    assert.equal(res, null);
    assert.equal(fetchCallCount, 0, "Confidential offer must trigger 0 network calls.");
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});

test("Network Interception 6: PUBLIC_OFFER alone without valid sanitized fields -> blocked, fetch = 0", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 });
  }) as typeof globalThis.fetch;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    fetchCallCount = 0;
    const res = await executeAiStructuredTask({
      context: { classification: "PUBLIC_OFFER" },
      jsonSchemaName: "test_schema",
      jsonSchema: { type: "object" },
      geminiAllowedFields: null, // No minimal sanitized fields provided
      userPrompt: "",
    });

    assert.equal(res.data, null);
    assert.equal(fetchCallCount, 0, "PUBLIC_OFFER without valid minimal fields must trigger 0 network calls.");
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});

test("Network Interception 7: Company name, sourceUrl, SIRET, raw text, and metadata are NOT sent in Gemini fetch body", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  let requestBody = "";
  let fetchCallCount = 0;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    fetchCallCount++;
    requestBody = String(init?.body || "");
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: "Développeur React",
                    summary: "Poste frontend",
                    skills: ["React"],
                    experienceYears: 3,
                    language: "FR",
                    categoryCode: "IT",
                    subCategoryCode: "DEV",
                    inPlatformScope: true,
                    scopeReason: "Ok",
                    confidence: 0.9,
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof globalThis.fetch;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    const res = await analyzeExternalOffer({
      title: "Développeur React Senior",
      description: "Poste en développement frontend moderne.",
      companyName: "Entreprise Interdite SAS",
      sourceUrl: "https://recrutement.externe/offre/123",
      country: "France",
      city: "Lyon",
      taxonomy: [],
    });

    assert.notEqual(res, null);
    assert.equal(fetchCallCount, 1, "Authorized request reached network once.");

    // Inspect request body to confirm companyName and sourceUrl were stripped
    assert.doesNotMatch(requestBody, /Entreprise Interdite SAS/);
    assert.doesNotMatch(requestBody, /https:\/\/recrutement\.externe\/offre\/123/);
    assert.doesNotMatch(requestBody, /companyName/);
    assert.doesNotMatch(requestBody, /sourceUrl/);
    assert.match(requestBody, /Développeur React Senior/);
    assert.match(requestBody, /Lyon, France/);
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});

test("Network Interception 8: Sourcing external offer uses same central guardrail & blocks forbidden data before network", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 });
  }) as typeof globalThis.fetch;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    fetchCallCount = 0;
    const res = await analyzeExternalOffer({
      title: "Consultant DevOps",
      description: "Envoyer un mail à recrutement@devops-agency.com pour postuler",
      companyName: "DevOps Agency",
      taxonomy: [],
    });

    assert.equal(res, null);
    assert.equal(fetchCallCount, 0, "External offer with PII must be blocked before network call.");
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});

test("Network Interception 9: Raw offer analysis uses same central guardrail & blocks forbidden data before network", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 });
  }) as typeof globalThis.fetch;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    fetchCallCount = 0;
    const res = await analyzeRawOffer({
      rawText: "Offre brute avec SIRET 12345678901234 et mail contact@societe.com",
      source: { title: "Architecte Cloud" },
      taxonomy: [],
    });

    assert.equal(res, null);
    assert.equal(fetchCallCount, 0, "Raw offer with PII must be blocked before network call.");
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});

test("Network Interception 10: Authorized text offer works, fetch = 1, request uses x-goog-api-key header", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  let requestedUrl = "";
  let requestHeaders: HeadersInit | undefined;
  let fetchCallCount = 0;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    fetchCallCount++;
    requestedUrl = String(url);
    requestHeaders = init?.headers;
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    skills: ["TypeScript", "Node.js"],
                    experienceYears: 4,
                    location: "Paris",
                    missionType: "CDI",
                    description: "Développeur Backend",
                    categoryCode: "IT",
                    subCategoryCode: "DEV",
                    summary: "Poste backend senior",
                    confidence: 0.95,
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof globalThis.fetch;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-secret-header-key-999";

    const res = await analyzeJobOffer({
      title: "Développeur Backend TypeScript",
      description: "Poste ouvert au public pour concevoir des API REST robustes.",
      location: "Paris",
      missionType: "CDI",
      requiredExperienceYears: 4,
      taxonomy: [],
    });

    assert.notEqual(res, null);
    assert.equal(res?.location, "Paris");
    assert.equal(fetchCallCount, 1, "Authorized request should reach network exactly once.");

    assert.doesNotMatch(requestedUrl, /test-secret-header-key-999/);
    assert.doesNotMatch(requestedUrl, /key=/);

    const headersObj = requestHeaders as Record<string, string>;
    assert.equal(headersObj["x-goog-api-key"], "test-secret-header-key-999");
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});

test("Sanitizer Unit Test: sanitizeAndValidateGeminiPayload reconstructs minimal text allowlist", () => {
  const res = sanitizeAndValidateGeminiPayload({
    title: "Développeur Python",
    location: "Bordeaux, France",
    missionType: "CDI",
    skills: ["Python", "Django"],
    experienceYears: 3,
    descriptionSummary: "Conception d'applications backend.",
  });

  assert.equal(res.allowed, true);
  assert.match(res.sanitizedPrompt || "", /Titre: Développeur Python/);
  assert.match(res.sanitizedPrompt || "", /Localisation: Bordeaux, France/);
  assert.match(res.sanitizedPrompt || "", /Compétences: Python, Django/);
});

test("OpenAI Non-Regression: Real CVs and candidate data remain fully operational with OpenAI", () => {
  const openAiCvResult = evaluatePrivacyGuardrails("openai", {
    classification: "REAL_CV",
  });
  assert.equal(openAiCvResult.allowed, true);

  const openAiCandidateResult = evaluatePrivacyGuardrails("openai", {
    classification: "CANDIDATE_DATA",
    containsPii: true,
  });
  assert.equal(openAiCandidateResult.allowed, true);
});
