import OpenAI from "openai";

export type CvTaxonomyItem = {
  code: string;
  name: string;
  parentCode?: string | null;
};

export type CvAnalysis = {
  headline: string | null;
  summary: string | null;
  skills: string[];
  experienceYears: number | null;
  languages: string[];
  primaryCategoryCode: string | null;
  subCategoryCodes: string[];
  suggestedFolder: string | null;
  confidence: number;
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: ["string", "null"] },
    summary: { type: ["string", "null"] },
    skills: { type: "array", items: { type: "string" } },
    experienceYears: { type: ["number", "null"] },
    languages: { type: "array", items: { type: "string" } },
    primaryCategoryCode: { type: ["string", "null"] },
    subCategoryCodes: { type: "array", items: { type: "string" } },
    suggestedFolder: { type: ["string", "null"] },
    confidence: { type: "number" },
  },
  required: [
    "headline",
    "summary",
    "skills",
    "experienceYears",
    "languages",
    "primaryCategoryCode",
    "subCategoryCodes",
    "suggestedFolder",
    "confidence",
  ],
} as const;

export async function analyzeCvDocument(input: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  taxonomy: CvTaxonomyItem[];
}): Promise<CvAnalysis | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const taxonomyText = input.taxonomy
    .map((item) => `${item.code} — ${item.name}${item.parentCode ? ` (parent: ${item.parentCode})` : ""}`)
    .join("\n");

  const response = await client.responses.create({
    model: process.env.OPENAI_CV_MODEL || "gpt-4.1-mini",
    input: [{
      role: "user",
      content: [
        {
          type: "input_file",
          filename: input.fileName,
          file_data: `data:${input.mimeType};base64,${input.buffer.toString("base64")}`,
        },
        {
          type: "input_text",
          text: `Analyse ce CV pour le moteur de recrutement Recrutement Privé.
Extrais uniquement des informations professionnelles utiles au recrutement.
Ne déduis pas de données sensibles non nécessaires et ne crée aucune expérience ou compétence absente du document.
Retourne les compétences normalisées, l'expérience totale approximative en années si elle est explicitement estimable, le métier principal et les sous-domaines.
Utilise uniquement les codes de la taxonomie fournie. Si aucune correspondance fiable n'existe, utilise null / [].
Le CV doit pouvoir être rematché ensuite avec des offres différentes de celle qui aurait éventuellement conduit à son dépôt.

Taxonomie disponible:
${taxonomyText || "Aucune taxonomie fournie."}`,
        },
      ],
    }],
    text: {
      format: {
        type: "json_schema",
        name: "cv_analysis",
        strict: true,
        schema,
      },
    },
  });

  if (!response.output_text) return null;

  const parsed = JSON.parse(response.output_text) as CvAnalysis;
  return {
    headline: typeof parsed.headline === "string" ? parsed.headline.trim() || null : null,
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() || null : null,
    skills: Array.isArray(parsed.skills) ? parsed.skills.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [],
    experienceYears: typeof parsed.experienceYears === "number" && Number.isFinite(parsed.experienceYears)
      ? Math.max(0, Math.min(60, Math.round(parsed.experienceYears)))
      : null,
    languages: Array.isArray(parsed.languages) ? parsed.languages.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [],
    primaryCategoryCode: typeof parsed.primaryCategoryCode === "string" ? parsed.primaryCategoryCode.trim() || null : null,
    subCategoryCodes: Array.isArray(parsed.subCategoryCodes) ? parsed.subCategoryCodes.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [],
    suggestedFolder: typeof parsed.suggestedFolder === "string" ? parsed.suggestedFolder.trim() || null : null,
    confidence: typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
  };
}
