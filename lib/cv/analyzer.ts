import { executeAiStructuredTask, getActiveAiProvider } from "@/lib/ai/client";
import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

async function parsePdfText(buffer: Buffer): Promise<string | null> {
  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: buffer, CanvasFactory });
    const result = await parser.getText();
    return result.text ? result.text.trim() : null;
  } catch (error) {
    console.warn(
      "[cv pdf extraction] parser failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return null;
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}

async function parseDocxText(buffer: Buffer): Promise<string | null> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ? result.value.trim() : null;
  } catch {
    return null;
  }
}

export async function extractTextFromCvBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string | null> {
  if (!buffer || buffer.length === 0) return null;

  const lowerName = fileName.toLowerCase();

  if (
    mimeType.includes("text/plain") ||
    mimeType.includes("text/markdown") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md")
  ) {
    const raw = buffer.toString("utf-8").trim();
    return raw.length > 0 ? raw : null;
  }

  if (mimeType.includes("pdf") || lowerName.endsWith(".pdf")) {
    return parsePdfText(buffer);
  }

  if (
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("msword") ||
    lowerName.endsWith(".docx")
  ) {
    return parseDocxText(buffer);
  }

  try {
    const str = buffer.toString("utf-8");
    const printableChars = str.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, "");
    if (printableChars.length >= 20 && printableChars.length / str.length > 0.6) {
      return printableChars.trim();
    }
  } catch {}

  return null;
}

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
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  location: string | null;
  country: string | null;
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
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  evidenceIndices: string[];
  analysisLimits: string | null;
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    firstName: { type: ["string", "null"] },
    lastName: { type: ["string", "null"] },
    email: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    address: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
    country: { type: ["string", "null"] },
    headline: { type: ["string", "null"] },
    summary: { type: ["string", "null"] },
    improvedSummary: { type: ["string", "null"] },
    skills: { type: "array", items: { type: "string" } },
    explicitSkills: { type: "array", items: { type: "string" } },
    experienceYears: { type: ["number", "null"] },
    experiences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          company: { type: ["string", "null"] },
          start: { type: ["string", "null"] },
          end: { type: ["string", "null"] },
          durationYears: { type: ["number", "null"] },
          evidence: { type: "string" },
        },
        required: ["title", "company", "start", "end", "durationYears", "evidence"],
      },
    },
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
    confidenceLevel: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
    evidenceIndices: { type: "array", items: { type: "string" } },
    analysisLimits: { type: ["string", "null"] },
  },
  required: [
    "firstName",
    "lastName",
    "email",
    "phone",
    "address",
    "location",
    "country",
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
    "confidenceLevel",
    "evidenceIndices",
    "analysisLimits",
  ],
} as const;

export type CvFileContent =
  | { type: "input_image"; image_url: string; detail: "auto" }
  | { type: "input_file"; filename: string; file_data: string };

export function buildCvFileContent(input: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): CvFileContent {
  const encodedFile = input.buffer.toString("base64");
  if (input.mimeType === "image/jpeg") {
    return {
      type: "input_image",
      image_url: `data:image/jpeg;base64,${encodedFile}`,
      detail: "auto",
    };
  }
  return {
    type: "input_file",
    filename: input.fileName,
    file_data: `data:${input.mimeType};base64,${encodedFile}`,
  };
}

export function parseCvTextLocally(rawText: string, taxonomy: CvTaxonomyItem[]): CvAnalysis {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lower = rawText.toLocaleLowerCase();
  const skillTerms = [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "PHP", "Ruby", "Go", "Rust",
    "Swift", "Kotlin", "React", "Vue", "Angular", "Next.js", "Node.js", "Express", "Django",
    "Spring", "Laravel", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Prisma", "AWS",
    "Azure", "GCP", "Docker", "Kubernetes", "DevOps", "CI/CD", "Git", "Agile", "Scrum",
    "Management", "Recrutement", "Finance", "Comptabilité", "Audit", "Sourcing", "Vente", "B2B",
    "machine learning", "pandas", "scikit-learn", "API", "CRM", "IFRS", "contrôle interne",
    "gestion de projet", "avant-vente", "Talent Acquisition", "grands comptes"
  ];
  const explicitSkills = skillTerms.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("\\b" + escaped + "\\b", "i").test(rawText);
  });
  const languageTerms = ["Français", "Anglais", "Espagnol", "Allemand", "Italien", "Arabe", "Néerlandais", "Chinois"];
  const languages = languageTerms.filter((language) =>
    new RegExp("\\b" + language + "\\b", "i").test(rawText)
  );
  let experienceYears: number | null = null;
  const experienceMatch = rawText.match(/\b(\d{1,2})\s*(?:ans?|années?)\s*(?:d[’\x27]expérience|expérience)\b/i);
  if (experienceMatch) {
    const parsedYears = Number(experienceMatch[1]);
    if (parsedYears >= 0 && parsedYears <= 60) experienceYears = parsedYears;
  }
  if (experienceYears === null) {
    const ranges = [...rawText.matchAll(/\b(19\d{2}|20\d{2})\s*[-–—]\s*(19\d{2}|20\d{2}|présent|aujourd’hui|today)\b/gi)];
    const durations = ranges.map((match) => {
      const startYear = Number(match[1]);
      const endYear = /^(présent|aujourd’hui|today)$/i.test(match[2]) ? new Date().getFullYear() : Number(match[2]);
      return endYear >= startYear && endYear - startYear <= 60 ? endYear - startYear : null;
    }).filter((value): value is number => value !== null);
    if (durations.length) experienceYears = Math.max(...durations);
  }
  let primaryCategoryCode: string | null = null;
  const subCategoryCodes: string[] = [];
  const evidenceIndices: string[] = [];

  for (const item of taxonomy) {
    if (!item.code) continue;
    const nameMatch = Boolean(item.name) && lower.includes(item.name.toLocaleLowerCase());
    const codeMatch = new RegExp("(^|[^a-z0-9_])" + item.code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").toLocaleLowerCase() + "([^a-z0-9_]|$)", "i").test(rawText);
    if (nameMatch || codeMatch) {
      evidenceIndices.push(`Mention textuelle correspondant à la catégorie ${item.name} (${item.code})`);
      if (item.parentCode) {
        if (!subCategoryCodes.includes(item.code)) subCategoryCodes.push(item.code);
        if (!primaryCategoryCode) primaryCategoryCode = item.parentCode;
      } else if (!primaryCategoryCode) primaryCategoryCode = item.code;
    }
  }

  const headline = lines.find((line) => !/^CV\s+TEST\b/i.test(line))?.slice(0, 160) ?? null;
  if (headline) {
    evidenceIndices.push(`Intitulé professionnel détecté: "${headline}"`);
  }

  const summary = lines.length > 1 ? lines.slice(1, 4).join(" ").slice(0, 500) || null : null;
  const hasDirectFacts = explicitSkills.length > 0 || languages.length > 0 || experienceYears !== null || primaryCategoryCode !== null;

  const confidenceLevel: "HIGH" | "MEDIUM" | "LOW" =
    explicitSkills.length >= 2 && (primaryCategoryCode !== null || experienceYears !== null)
      ? "HIGH"
      : hasDirectFacts
      ? "MEDIUM"
      : "LOW";

  const analysisLimits =
    confidenceLevel === "LOW"
      ? "Extraits factuels réduits dans le document. Classification minimale conservée d'après l'intitulé professionnel source."
      : null;

  return {
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    address: null,
    location: null,
    country: null,
    headline,
    summary,
    improvedSummary: summary,
    skills: explicitSkills,
    explicitSkills,
    experienceYears,
    experiences: [],
    education: [],
    certifications: [],
    languages,
    primaryCategoryCode,
    subCategoryCodes,
    alternativeCategoryCodes: [],
    suggestedPositioning: explicitSkills.slice(0, 3),
    careerLevel: "NON_SPECIFIE",
    careerLevelEvidence: null,
    suggestedFolder: primaryCategoryCode ? "CANDIDATS/" + primaryCategoryCode : "CANDIDATS/A_CLASSER/CV",
    confidence: confidenceLevel === "HIGH" ? 0.9 : confidenceLevel === "MEDIUM" ? 0.6 : 0.2,
    confidenceLevel,
    evidenceIndices,
    analysisLimits,
  };
}

export async function analyzeCvDocumentLocally(input: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  taxonomy: CvTaxonomyItem[];
}): Promise<CvAnalysis | null> {
  const text = await extractTextFromCvBuffer(input.buffer, input.mimeType, input.fileName);
  return text ? parseCvTextLocally(text, input.taxonomy) : null;
}

export async function analyzeCvDocument(input: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  taxonomy: CvTaxonomyItem[];
}): Promise<CvAnalysis | null> {
  const provider = getActiveAiProvider();

  if (!provider || provider === "gemini") {
    return analyzeCvDocumentLocally(input);
  }

  const taxonomyText = input.taxonomy
    .map((item) => `${item.code} — ${item.name}${item.parentCode ? ` (parent: ${item.parentCode})` : ""}`)
    .join("\n");

  const promptText = `Analyse ce CV pour le moteur de recrutement Recrutement Privé.
Extrais uniquement les informations professionnelles utiles au recrutement. Lorsque le document contient des coordonnées directement affichées par le candidat, extrais aussi le prénom, nom, e-mail, téléphone, adresse, ville/localisation et pays. Ces coordonnées doivent être reprises telles qu’elles apparaissent, sans les inventer ni les compléter.
Ne déduis pas de données sensibles non nécessaires et ne crée aucune expérience ou compétence absente du document.
Sépare les faits explicitement présents (explicitSkills) du positionnement ou compétences normalisées (skills). Détermine un niveau de confiance (confidenceLevel: HIGH, MEDIUM, LOW) et liste les preuves textuelles (evidenceIndices) qui justifient la classification. S'il manque des éléments essentiels, renseigne analysisLimits.
Utilise uniquement les codes de la taxonomie fournie.

Taxonomie disponible:
${taxonomyText || "Aucune taxonomie fournie."}`;

  const response = await executeAiStructuredTask<CvAnalysis>({
    userPrompt: promptText,
    fileInput: {
      fileName: input.fileName,
      mimeType: input.mimeType,
      buffer: input.buffer,
    },
    jsonSchemaName: "cv_analysis",
    jsonSchema: schema as unknown as Record<string, unknown>,
    context: { classification: "REAL_CV" },
    modelOverride: process.env.OPENAI_CV_MODEL,
  });

  if (!response.data) return null;

  const parsed = response.data;
  const confidenceLevel = ["HIGH", "MEDIUM", "LOW"].includes(parsed.confidenceLevel) ? parsed.confidenceLevel : "MEDIUM";

  return {
    firstName: typeof parsed.firstName === "string" ? parsed.firstName.trim() || null : null,
    lastName: typeof parsed.lastName === "string" ? parsed.lastName.trim() || null : null,
    email: typeof parsed.email === "string" && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(parsed.email.trim()) ? parsed.email.trim().toLowerCase() : null,
    phone: typeof parsed.phone === "string" ? parsed.phone.trim() || null : null,
    address: typeof parsed.address === "string" ? parsed.address.trim() || null : null,
    location: typeof parsed.location === "string" ? parsed.location.trim() || null : null,
    country: typeof parsed.country === "string" ? parsed.country.trim() || null : null,
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
    confidence: typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
    confidenceLevel,
    evidenceIndices: Array.isArray(parsed.evidenceIndices) ? parsed.evidenceIndices.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [],
    analysisLimits: typeof parsed.analysisLimits === "string" ? parsed.analysisLimits.trim() || null : null,
  };
}
