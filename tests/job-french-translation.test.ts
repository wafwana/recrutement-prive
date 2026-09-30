import test from "node:test";
import assert from "node:assert/strict";
import { isLikelyFrenchText, translateJobOfferToFrench } from "../lib/jobs/translation";

test("French Translation Engine: Heuristic detection accurately identifies French text", () => {
  assert.equal(isLikelyFrenchText("Nous recherchons un développeur senior pour rejoindre notre équipe et participer aux missions."), true);
  assert.equal(isLikelyFrenchText("Poste de chef de projet dans le domaine du recrutement avec expérience."), true);
  assert.equal(isLikelyFrenchText("We are looking for a Senior Fullstack Engineer to join our team."), false);
  assert.equal(isLikelyFrenchText("Buscamos un ingeniero de software con experiencia en Python."), false);
});

test("French Translation Engine: French job offer returns original text without AI invocation", async () => {
  const frenchOffer = {
    title: "Développeur Fullstack TypeScript / React",
    description: "Nous recherchons un développeur passionné pour rejoindre notre équipe et participer aux missions de recrutement.",
    location: "Paris, France",
    missionType: "CDI",
  };

  const result = await translateJobOfferToFrench(frenchOffer);

  assert.equal(result.isAutoTranslated, false);
  assert.equal(result.sourceLanguage, "fr");
  assert.equal(result.titleFr, frenchOffer.title);
  assert.equal(result.descriptionFr, frenchOffer.description);
});

test("French Translation Engine: Non-French job offer generates French translation while preserving original source text", async () => {
  const englishOffer = {
    title: "Senior Backend Software Engineer",
    description: "We are seeking an experienced Backend Engineer to design scalable microservices architectures.",
    location: "Remote",
    missionType: "Full-Time",
  };

  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    titleFr: "Ingénieur Logiciel Backend Senior",
                    descriptionFr: "Nous recherchons un ingénieur backend expérimenté pour concevoir des architectures microservices évolutives.",
                    summaryFr: "Poste d'ingénieur backend senior pour concevoir des microservices.",
                    sourceLanguage: "en",
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

    const result = await translateJobOfferToFrench(englishOffer);

    assert.equal(result.isAutoTranslated, true);
    assert.equal(result.sourceLanguage, "en");
    assert.equal(result.titleFr, "Ingénieur Logiciel Backend Senior");
    assert.match(result.descriptionFr, /ingénieur backend expérimenté/i);
    assert.notEqual(result.summaryFr, null);
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});

test("French Translation Engine: AI provider timeout / error falls back gracefully to original text", async () => {
  const spanishOffer = {
    title: "Ingeniero de Datos",
    description: "Buscamos un especialista en pipelines de datos y Big Data.",
  };

  const originalProvider = process.env.AI_PROVIDER;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return new Response("Internal Server Error", { status: 500 });
  }) as typeof globalThis.fetch;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    const result = await translateJobOfferToFrench(spanishOffer);

    assert.equal(result.titleFr, spanishOffer.title);
    assert.equal(result.descriptionFr, spanishOffer.description);
    assert.equal(result.isAutoTranslated, false);
  } finally {
    process.env.AI_PROVIDER = originalProvider;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    globalThis.fetch = originalFetch;
  }
});
