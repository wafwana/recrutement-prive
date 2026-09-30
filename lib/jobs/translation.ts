import { executeAiStructuredTask } from "@/lib/ai/client";
import { AiAnalysisContext } from "@/lib/ai/types";

export type FrenchTranslationResult = {
  titleFr: string;
  descriptionFr: string;
  summaryFr: string | null;
  sourceLanguage: string;
  isAutoTranslated: boolean;
  translatedAt: string;
};

const translationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    titleFr: { type: "string" },
    descriptionFr: { type: "string" },
    summaryFr: { type: ["string", "null"] },
    sourceLanguage: { type: "string" },
  },
  required: ["titleFr", "descriptionFr", "summaryFr", "sourceLanguage"],
} as const;

/**
 * Basic heuristic detection for French text.
 * Requires a significant density of French-specific stopwords and character patterns.
 */
export function isLikelyFrenchText(text: string): boolean {
  if (!text || text.trim().length === 0) return true;
  const sample = text.toLowerCase();

  // High-frequency French stopwords
  const frenchKeywords = [
    /\bnous\s+recherchons\b/, /\bposte\s+de\b/, /\bcandidature\b/, /\bexpérience\b/,
    /\béquipes?\b/, /\bgestion\b/, /\brecrutement\b/, /\bdomaine\b/, /\bdans\s+le\b/,
    /\bpour\s+rejoindre\b/, /\bmissions?\b/
  ];

  let matches = 0;
  for (const regex of frenchKeywords) {
    if (regex.test(sample)) matches++;
  }

  // Check French accented characters density
  const hasAccents = /[éèêàâùûçîïôœæ]/.test(sample);

  return matches >= 2 || (matches >= 1 && hasAccents);
}

/**
 * Translates a job offer's dynamic text content into French.
 * - If the content is already in French, returns original text without AI invocation (cost & performance optimization).
 * - Preserves original source text 100%.
 * - Uses centralized AI client with strict privacy guardrails (`PUBLIC_OFFER` classification, zero candidate/PII data).
 * - Does NOT alter proper nouns, brand names, salary numbers, contact emails, or URLs.
 */
export async function translateJobOfferToFrench(input: {
  title: string;
  description?: string | null;
  location?: string | null;
  missionType?: string | null;
  skills?: string[] | null;
  experienceYears?: number | null;
}): Promise<FrenchTranslationResult> {
  const originalTitle = input.title?.trim() || "";
  const originalDescription = input.description?.trim() || "";
  const combinedText = `${originalTitle}\n${originalDescription}`;

  const now = new Date().toISOString();

  // Heuristic check: if already French, return original text without AI call
  if (isLikelyFrenchText(combinedText)) {
    return {
      titleFr: originalTitle,
      descriptionFr: originalDescription,
      summaryFr: null,
      sourceLanguage: "fr",
      isAutoTranslated: false,
      translatedAt: now,
    };
  }

  const context: AiAnalysisContext = {
    classification: "PUBLIC_OFFER",
  };

  const response = await executeAiStructuredTask<{
    titleFr: string;
    descriptionFr: string;
    summaryFr?: string | null;
    sourceLanguage?: string;
  }>({
    context,
    jsonSchemaName: "job_french_translation",
    jsonSchema: translationSchema as any,
    geminiAllowedFields: {
      title: originalTitle,
      location: input.location,
      missionType: input.missionType,
      skills: input.skills,
      experienceYears: input.experienceYears,
      descriptionSummary: originalDescription,
    },
    userPrompt: `Traduis avec précision cette offre d'emploi en français professionnel pour le marché du recrutement.

Directives strictes :
- Traduis l'intitulé du poste (titleFr) et la description (descriptionFr) en un français fluide, professionnel et adapté.
- Ne traduis pas les noms propres d'entreprises, les marques, les sigles techniques internationaux (ex: TypeScript, React, AWS, CRM, CEO, CDI) ni les adresses/URLs.
- Conserve exactement les nombres, années d'expérience et éléments chiffrés.
- Génère un résumé professionnel très court en 1 à 2 phrases en français (summaryFr).
- Identifie la langue d'origine (sourceLanguage, ex: "en", "es", "de").

Titre original : ${originalTitle}
Description originale :
${originalDescription || "(aucune description)"}`,
  });

  if (!response.data) {
    // Graceful fallback on AI failure / timeout
    return {
      titleFr: originalTitle,
      descriptionFr: originalDescription,
      summaryFr: null,
      sourceLanguage: "unknown",
      isAutoTranslated: false,
      translatedAt: now,
    };
  }

  return {
    titleFr: response.data.titleFr?.trim() || originalTitle,
    descriptionFr: response.data.descriptionFr?.trim() || originalDescription,
    summaryFr: response.data.summaryFr?.trim() || null,
    sourceLanguage: response.data.sourceLanguage?.toLowerCase().trim() || "auto",
    isAutoTranslated: true,
    translatedAt: now,
  };
}
