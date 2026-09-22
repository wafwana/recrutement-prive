import OpenAI from "openai";

export type OfferTaxonomyItem = { code: string; name: string; parentCode?: string | null };
export type OfferAnalysis = {
  summary: string | null; skills: string[]; experienceYears: number | null; languages: string[];
  primaryCategoryCode: string | null; subCategoryCode: string | null; suggestedFolder: string | null; confidence: number;
};

const schema = {
  type: "object", additionalProperties: false,
  properties: {
    summary: { type: ["string", "null"] }, skills: { type: "array", items: { type: "string" } },
    experienceYears: { type: ["number", "null"] }, languages: { type: "array", items: { type: "string" } },
    primaryCategoryCode: { type: ["string", "null"] }, subCategoryCode: { type: ["string", "null"] },
    suggestedFolder: { type: ["string", "null"] }, confidence: { type: "number" }
  },
  required: ["summary","skills","experienceYears","languages","primaryCategoryCode","subCategoryCode","suggestedFolder","confidence"]
} as const;

export async function analyzeOffer(input: {
  title: string; description?: string | null; requiredSkills?: unknown; requiredExperienceYears?: number | null;
  location?: string | null; missionType?: string | null; taxonomy: OfferTaxonomyItem[];
}): Promise<OfferAnalysis | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const taxonomyText = input.taxonomy.map(item => `${item.code} — ${item.name}${item.parentCode ? ` (parent: ${item.parentCode})` : ""}`).join("\n");
  const response = await client.responses.create({
    model: process.env.OPENAI_OFFER_MODEL || process.env.OPENAI_CV_MODEL || "gpt-4.1-mini",
    input: [{ role: "user", content: [{ type: "input_text", text: `Analyse cette offre pour Recrutement Privé. Extrais uniquement les informations professionnelles utiles au recrutement. Ne crée aucune exigence absente du brief. Normalise les compétences, l'expérience, les langues et la catégorie/sous-catégorie. Cette offre doit pouvoir matcher des candidats issus d'autres offres, candidatures ou sources. Taxonomie:\n${taxonomyText || "Aucune taxonomie."}\n\nTitre: ${input.title}\nLocalisation: ${input.location || ""}\nType: ${input.missionType || ""}\nCompétences: ${JSON.stringify(input.requiredSkills ?? [])}\nExpérience: ${input.requiredExperienceYears ?? ""}\nDescription: ${input.description || ""}` }] }],
    text: { format: { type: "json_schema", name: "offer_analysis", strict: true, schema } }
  });
  if (!response.output_text) return null;
  const parsed = JSON.parse(response.output_text) as OfferAnalysis;
  return {
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() || null : null,
    skills: Array.isArray(parsed.skills) ? parsed.skills.filter((v): v is string => typeof v === "string").map(v => v.trim()).filter(Boolean) : [],
    experienceYears: typeof parsed.experienceYears === "number" && Number.isFinite(parsed.experienceYears) ? Math.max(0, Math.min(60, Math.round(parsed.experienceYears))) : null,
    languages: Array.isArray(parsed.languages) ? parsed.languages.filter((v): v is string => typeof v === "string").map(v => v.trim()).filter(Boolean) : [],
    primaryCategoryCode: typeof parsed.primaryCategoryCode === "string" ? parsed.primaryCategoryCode.trim() || null : null,
    subCategoryCode: typeof parsed.subCategoryCode === "string" ? parsed.subCategoryCode.trim() || null : null,
    suggestedFolder: typeof parsed.suggestedFolder === "string" ? parsed.suggestedFolder.trim() || null : null,
    confidence: typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : 0
  };
}
