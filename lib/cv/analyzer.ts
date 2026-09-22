import OpenAI from "openai";

export type CvTaxonomyItem = {
  code: string;
  name: string;
  parentCode?: string | null;
};

export type CvExperience = {
  title: string;
  company: string | null;
  start: string | null;
  end: string | null;
  durationYears: number | null;
  evidence: string;
};

export type CvAnalysis = {
  headline: string | null;
  summary: string | null;
  improvedSummary: string | null;
  skills: string[];
  explicitSkills: string[];
  experienceYears: number | null;
  experiences: CvExperience[];
  education: string[];
  certifications: string[];
  languages: string[];
  primaryCategoryCode: string | null;
  subCategoryCodes: string[];
  alternativeCategoryCodes: string[];
  suggestedPositioning: string[];
  careerLevel: "SPECIALISTE" | "MANAGER" | "CADRE" | "HAUT_CADRE" | "DIRECTION" | "NON_SPECIFIE";
  careerLevelEvidence: string | null;
  suggestedFolder: string | null;
  confidence: number;
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: ["string", "null"] },
    summary: { type: ["string", "null"] },
    improvedSummary: { type: ["string", "null"] },
    skills: { type: "array", items: { type: "string" } },
    explicitSkills: { type: "array", items: { type: "string" } },
    experienceYears: { type: ["number", "null"] },
    experiences: { type: "array", items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, company: { type: ["string","null"] }, start: { type: ["string","null"] }, end: { type: ["string","null"] }, durationYears: { type: ["number","null"] }, evidence: { type: "string" } }, required: ["title","company","start","end","durationYears","evidence"] } },
    education: { type: "array", items: { type: "string" } },
    certifications: { type: "array", items: { type: "string" } },
    languages: { type: "array", items: { type: "string" } },
    primaryCategoryCode: { type: ["string", "null"] },
    subCategoryCodes: { type: "array", items: { type: "string" } },
    alternativeCategoryCodes: { type: "array", items: { type: "string" } },
    suggestedPositioning: { type: "array", items: { type: "string" } },
    careerLevel: { type: "string", enum: ["SPECIALISTE", "MANAGER", "CADRE", "HAUT_CADRE", "DIRECTION", "NON_SPECIFIE"] },
    careerLevelEvidence: { type: ["string", "null"] },
    suggestedFolder: { type: ["string", "null"] },
    confidence: { type: "number" },
  },
  required: [
    "headline",
    "summary",
    "improvedSummary",
    "skills",
    "explicitSkills",
    "experienceYears",
    "experiences",
    "education",
    "certifications",
    "languages",
    "primaryCategoryCode",
    "subCategoryCodes",
    "alternativeCategoryCodes",
    "suggestedPositioning",
    "careerLevel",
    "careerLevelEvidence",
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

  const encodedFile = input.buffer.toString("base64");
  const fileContent =
    input.mimeType === "image/jpeg"
      ? {
          type: "input_image" as const,
          image_url: `data:image/jpeg;base64,${encodedFile}`,
          detail: "auto",
        }
      : {
          type: "input_file" as const,
          filename: input.fileName,
          file_data: `data:${input.mimeType};base64,${encodedFile}`,
        };

  const response = await client.responses.create({
    model: process.env.OPENAI_CV_MODEL || "gpt-4.1-mini",
    input: [{
      role: "user",
      content: [
        fileContent,
        {
          type: "input_text",
          text: `Analyse ce CV pour le moteur de recrutement Recrutement Privé.
Extrais uniquement des informations professionnelles utiles au recrutement.
Ne déduis pas de données sensibles non nécessaires et ne crée aucune expérience ou compétence absente du document.
Sépare les faits explicitement présents du positionnement suggéré. Détermine aussi un niveau de carrière uniquement lorsqu'il est étayé par le CV (SPECIALISTE, MANAGER, CADRE, HAUT_CADRE, DIRECTION), sinon NON_SPECIFIE, et fournis une preuve courte. Pour chaque expérience, conserve un élément de preuve textuel court. Extrait aussi formations et certifications. improvedSummary peut reformuler et mieux présenter les faits, mais ne doit ajouter aucun fait absent du CV.
Retourne les compétences normalisées, l'expérience totale approximative en années si elle est explicitement estimable, le métier principal et les sous-domaines.
Retourne aussi jusqu’à 3 secteurs alternatifs réellement compatibles avec le parcours, uniquement s’ils sont suffisamment étayés par le CV et la taxonomie.
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
    improvedSummary: typeof parsed.improvedSummary === "string" ? parsed.improvedSummary.trim() || null : null,
    skills: Array.isArray(parsed.skills) ? parsed.skills.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [],
    explicitSkills: Array.isArray(parsed.explicitSkills) ? parsed.explicitSkills.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [],
    experiences: Array.isArray(parsed.experiences) ? parsed.experiences.filter((v) => v && typeof v === "object" && typeof v.title === "string").map((v) => ({ title: v.title.trim(), company: typeof v.company === "string" ? v.company.trim() || null : null, start: typeof v.start === "string" ? v.start.trim() || null : null, end: typeof v.end === "string" ? v.end.trim() || null : null, durationYears: typeof v.durationYears === "number" && Number.isFinite(v.durationYears) ? Math.max(0, Math.min(60, v.durationYears)) : null, evidence: typeof v.evidence === "string" ? v.evidence.trim() : "" })) : [],
    education: Array.isArray(parsed.education) ? parsed.education.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [],
    certifications: Array.isArray(parsed.certifications) ? parsed.certifications.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [],
    experienceYears: typeof parsed.experienceYears === "number" && Number.isFinite(parsed.experienceYears)
      ? Math.max(0, Math.min(60, Math.round(parsed.experienceYears)))
      : null,
    languages: Array.isArray(parsed.languages) ? parsed.languages.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [],
    primaryCategoryCode: typeof parsed.primaryCategoryCode === "string" ? parsed.primaryCategoryCode.trim() || null : null,
    subCategoryCodes: Array.isArray(parsed.subCategoryCodes) ? parsed.subCategoryCodes.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [],
    alternativeCategoryCodes: Array.isArray(parsed.alternativeCategoryCodes) ? [...new Set(parsed.alternativeCategoryCodes.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean))].slice(0, 3) : [],
    suggestedPositioning: Array.isArray(parsed.suggestedPositioning) ? [...new Set(parsed.suggestedPositioning.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean))].slice(0, 6) : [],
    careerLevel: ["SPECIALISTE", "MANAGER", "CADRE", "HAUT_CADRE", "DIRECTION"].includes(parsed.careerLevel) ? parsed.careerLevel : "NON_SPECIFIE",
    careerLevelEvidence: typeof parsed.careerLevelEvidence === "string" ? parsed.careerLevelEvidence.trim() || null : null,
    suggestedFolder: typeof parsed.suggestedFolder === "string" ? parsed.suggestedFolder.trim() || null : null,
    confidence: typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
  };
}
