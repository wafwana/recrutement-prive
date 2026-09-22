import OpenAI from "openai";

export type OfferTaxonomyItem = {
  code: string;
  name: string;
  parentCode?: string | null;
};

export type ExternalOfferAnalysis = {
  title: string;
  summary: string;
  skills: string[];
  experienceYears: number | null;
  language: string | null;
  categoryCode: string | null;
  subCategoryCode: string | null;
  inPlatformScope: boolean;
  scopeReason: string;
  confidence: number;
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    experienceYears: { type: ["number", "null"] },
    language: { type: ["string", "null"] },
    categoryCode: { type: ["string", "null"] },
    subCategoryCode: { type: ["string", "null"] },
    inPlatformScope: { type: "boolean" },
    scopeReason: { type: "string" },
    confidence: { type: "number" },
  },
  required: [
    "title", "summary", "skills", "experienceYears", "language",
    "categoryCode", "subCategoryCode", "inPlatformScope", "scopeReason", "confidence",
  ],
} as const;

export async function analyzeExternalOffer(input: {
  title: string;
  description?: string | null;
  companyName?: string | null;
  country?: string | null;
  city?: string | null;
  sourceUrl?: string | null;
  taxonomy: OfferTaxonomyItem[];
}): Promise<ExternalOfferAnalysis | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const taxonomyText = input.taxonomy
    .map((item) => `${item.code} — ${item.name}${item.parentCode ? ` (parent: ${item.parentCode})` : ""}`)
    .join("\n");

  const response = await client.responses.create({
    model: process.env.OPENAI_CV_MODEL || "gpt-4.1-mini",
    input: [{
      role: "user",
      content: [{
        type: "input_text",
        text: `Analyse cette offre d'emploi pour Recrutement Privé.
Décortique le poste en titre, résumé professionnel, compétences requises, expérience, langue et taxonomie métier.
L'offre n'entre dans le périmètre de Recrutement Privé que si elle correspond à un recrutement professionnel réel et peut être rattachée de façon fiable à une catégorie ou sous-catégorie de la taxonomie fournie. Exclue les contenus qui ne sont pas des offres d'emploi exploitables.
Ne déduis pas de critères sensibles et ne crée pas d'information absente de l'offre.
Utilise uniquement les codes de la taxonomie fournie.
Une offre qualifiée pourra être rematchée avec les candidats de Recrutement Privé, y compris ceux qui n'ont jamais été liés à cette source.

Offre:
Titre: ${input.title}
Entreprise: ${input.companyName || "Non précisée"}
Pays: ${input.country || "Non précisé"}
Ville: ${input.city || "Non précisée"}
URL: ${input.sourceUrl || "Non précisée"}
Description:
${input.description || "Non précisée"}

Taxonomie:
${taxonomyText || "Aucune taxonomie fournie."}`,
      }],
    }],
    text: {
      format: {
        type: "json_schema",
        name: "external_offer_analysis",
        strict: true,
        schema,
      },
    },
  });

  if (!response.output_text) return null;
  const parsed = JSON.parse(response.output_text) as ExternalOfferAnalysis;
  return {
    title: parsed.title?.trim() || input.title,
    summary: parsed.summary?.trim() || "",
    skills: Array.isArray(parsed.skills) ? parsed.skills.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [],
    experienceYears: typeof parsed.experienceYears === "number" && Number.isFinite(parsed.experienceYears)
      ? Math.max(0, Math.min(60, Math.round(parsed.experienceYears)))
      : null,
    language: typeof parsed.language === "string" ? parsed.language.trim() || null : null,
    categoryCode: typeof parsed.categoryCode === "string" ? parsed.categoryCode.trim() || null : null,
    subCategoryCode: typeof parsed.subCategoryCode === "string" ? parsed.subCategoryCode.trim() || null : null,
    inPlatformScope: parsed.inPlatformScope === true,
    scopeReason: parsed.scopeReason?.trim() || "",
    confidence: typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0,
  };
}
