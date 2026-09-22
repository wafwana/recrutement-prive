import OpenAI from "openai";

export type ExternalOfferAnalysis = {
  summary: string | null;
  skills: string[];
  experienceYears: number | null;
  country: string | null;
  city: string | null;
  language: string | null;
  primaryCategoryCode: string | null;
  subCategoryCode: string | null;
  inPlatformScope: boolean;
  scopeReason: string;
  confidence: number;
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: ["string", "null"] },
    skills: { type: "array", items: { type: "string" } },
    experienceYears: { type: ["number", "null"] },
    country: { type: ["string", "null"] },
    city: { type: ["string", "null"] },
    language: { type: ["string", "null"] },
    primaryCategoryCode: { type: ["string", "null"] },
    subCategoryCode: { type: ["string", "null"] },
    inPlatformScope: { type: "boolean" },
    scopeReason: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["summary","skills","experienceYears","country","city","language","primaryCategoryCode","subCategoryCode","inPlatformScope","scopeReason","confidence"],
} as const;

export async function analyzeExternalOffer(input: {
  title: string;
  description: string | null;
  country: string | null;
  city: string | null;
  categoryCode: string | null;
  subCategoryCode: string | null;
  taxonomy: { code: string; name: string; parentCode?: string | null }[];
}): Promise<ExternalOfferAnalysis | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const taxonomyText = input.taxonomy.map((item) => `${item.code} — ${item.name}${item.parentCode ? ` (parent: ${item.parentCode})` : ""}`).join("\n");
  const response = await client.responses.create({
    model: process.env.OPENAI_CV_MODEL || "gpt-4.1-mini",
    input: [{
      role: "user",
      content: [{
        type: "input_text",
        text: `Décortique cette offre externe pour Recrutement Privé. Extrais uniquement les éléments professionnels utiles au recrutement. Utilise uniquement les codes de la taxonomie fournie. Une offre est "dans le cadre de la plateforme" uniquement si son métier peut être rattaché de façon fiable à la taxonomie active. Ne crée aucune compétence absente. Le résultat sert à filtrer et préparer un matching; la décision finale reste humaine.

Titre: ${input.title}
Pays: ${input.country ?? ""}
Ville: ${input.city ?? ""}
Catégorie source: ${input.categoryCode ?? ""}
Sous-catégorie source: ${input.subCategoryCode ?? ""}
Description:
${input.description ?? "Non disponible"}

Taxonomie:
${taxonomyText || "Aucune taxonomie disponible."}`,
      }],
    }],
    text: { format: { type: "json_schema", name: "external_offer_analysis", strict: true, schema } },
  });
  if (!response.output_text) return null;
  const parsed = JSON.parse(response.output_text) as ExternalOfferAnalysis;
  return {
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() || null : null,
    skills: Array.isArray(parsed.skills) ? parsed.skills.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [],
    experienceYears: typeof parsed.experienceYears === "number" && Number.isFinite(parsed.experienceYears) ? Math.max(0, Math.min(60, Math.round(parsed.experienceYears))) : null,
    country: typeof parsed.country === "string" ? parsed.country.trim() || input.country : input.country,
    city: typeof parsed.city === "string" ? parsed.city.trim() || input.city : input.city,
    language: typeof parsed.language === "string" ? parsed.language.trim() || null : null,
    primaryCategoryCode: typeof parsed.primaryCategoryCode === "string" ? parsed.primaryCategoryCode.trim() || null : null,
    subCategoryCode: typeof parsed.subCategoryCode === "string" ? parsed.subCategoryCode.trim() || null : null,
    inPlatformScope: Boolean(parsed.inPlatformScope),
    scopeReason: typeof parsed.scopeReason === "string" ? parsed.scopeReason.trim() : "",
    confidence: typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
  };
}
