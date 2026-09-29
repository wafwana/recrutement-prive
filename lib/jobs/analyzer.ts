import OpenAI from "openai";

export type JobTaxonomyItem = {
  code: string;
  name: string;
  parentCode?: string | null;
};

export type JobAnalysis = {
  skills: string[];
  experienceYears: number | null;
  location: string | null;
  missionType: string | null;
  description: string | null;
  categoryCode: string | null;
  subCategoryCode: string | null;
  summary: string | null;
  confidence: number;
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    skills: { type: "array", items: { type: "string" } },
    experienceYears: { type: ["number", "null"] },
    location: { type: ["string", "null"] },
    missionType: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    categoryCode: { type: ["string", "null"] },
    subCategoryCode: { type: ["string", "null"] },
    summary: { type: ["string", "null"] },
    confidence: { type: "number" },
  },
  required: ["skills", "experienceYears", "location", "missionType", "description", "categoryCode", "subCategoryCode", "summary", "confidence"],
} as const;

export async function analyzeJobOffer(input: {
  title: string;
  description?: string | null;
  location?: string | null;
  missionType?: string | null;
  requiredSkills?: unknown;
  requiredExperienceYears?: number | null;
  taxonomy: JobTaxonomyItem[];
}): Promise<JobAnalysis | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const taxonomyText = input.taxonomy
    .map((item) => `${item.code} — ${item.name}${item.parentCode ? ` (parent: ${item.parentCode})` : ""}`)
    .join("\n");

  const response = await client.responses.create({
    model: process.env.OPENAI_JOB_MODEL || "gpt-4.1-mini",
    input: [{
      role: "user",
      content: [{
        type: "input_text",
        text: `Analyse cette offre pour le moteur de recrutement Recrutement Privé.

Objectif : transformer une saisie parfois incomplète en fiche d'offre exploitable par le moteur de matching.
- N'invente aucune information absente.
- Les compétences doivent être explicitement présentes ou directement exprimées dans le texte fourni.
- L'expérience doit être retenue uniquement si elle est explicitement indiquée ou clairement exprimée.
- La localisation et le type de mission ne doivent être renseignés que s'ils sont présents ou sans ambiguïté.
- La description peut être reformulée pour être plus claire, mais ne doit ajouter aucun fait.
- Choisis uniquement les codes de la taxonomie fournie.
- categoryCode doit être une catégorie parent ; subCategoryCode doit être une sous-catégorie enfant de cette catégorie.
- Si la correspondance métier n'est pas suffisamment fiable, retourne null.
- Le résumé doit décrire uniquement les éléments présents dans l'offre.

Titre : ${input.title}
Description : ${input.description || "(non renseignée)"}
Localisation : ${input.location || "(non renseignée)"}
Type de mission : ${input.missionType || "(non renseigné)"}
Compétences saisies : ${JSON.stringify(input.requiredSkills ?? [])}
Expérience saisie : ${input.requiredExperienceYears ?? "(non renseignée)"}

Taxonomie :
${taxonomyText || "(aucune taxonomie disponible)"}`,
      }],
    }],
    text: {
      format: {
        type: "json_schema",
        name: "job_offer_analysis",
        strict: true,
        schema,
      },
    },
  });

  if (!response.output_text) return null;
  const parsed = JSON.parse(response.output_text) as JobAnalysis;

  return {
    skills: Array.isArray(parsed.skills)
      ? [...new Set(parsed.skills.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean))]
      : [],
    experienceYears: typeof parsed.experienceYears === "number" && Number.isFinite(parsed.experienceYears)
      ? Math.max(0, Math.min(60, Math.round(parsed.experienceYears)))
      : null,
    location: typeof parsed.location === "string" ? parsed.location.trim() || null : null,
    missionType: typeof parsed.missionType === "string" ? parsed.missionType.trim() || null : null,
    description: typeof parsed.description === "string" ? parsed.description.trim() || null : null,
    categoryCode: typeof parsed.categoryCode === "string" ? parsed.categoryCode.trim() || null : null,
    subCategoryCode: typeof parsed.subCategoryCode === "string" ? parsed.subCategoryCode.trim() || null : null,
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() || null : null,
    confidence: typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0,
  };
}
