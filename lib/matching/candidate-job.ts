export type MatchingCandidate = {
  skills?: unknown;
  experienceYears?: number | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  country?: string | null;
  primaryCategoryCode?: string | null;
  subCategoryCodes?: unknown;
};

export type MatchingJob = {
  requiredSkills?: unknown;
  requiredExperienceYears?: number | null;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  country?: string | null;
  categoryCode?: string | null;
  subCategoryCode?: string | null;
};

export type MatchingResult = {
  score: number;
  skillScore: number;
  experienceScore: number;
  contextScore: number;
  categoryScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  categoryMatchLevel: "EXACT_SUBCATEGORY" | "PARENT_CATEGORY" | "NONE";
  countryFit: "SAME_COUNTRY" | "FRANCE_SWITZERLAND_CROSS_BORDER" | "OTHER_CROSS_BORDER" | "UNKNOWN";
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function toSkills(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string").map(normalize);
  if (value && typeof value === "object") return Object.values(value).filter((v): v is string => typeof v === "string").map(normalize);
  if (typeof value === "string") return value.split(/[,;\n|]/).map(normalize).filter(Boolean);
  return [];
}

function keywordContext(job: MatchingJob): string[] {
  return [job.title, job.description, job.location].filter((v): v is string => Boolean(v)).flatMap((v) => normalize(v).split(/[^a-z0-9+#.-]+/).filter((x) => x.length >= 4));
}

function normalizeCountry(value: string | null | undefined): string | null {
  if (!value) return null;
  const country = normalize(value).replace(/[^a-z]/g, "");
  if (["france", "fr", "frenchrepublic"].includes(country)) return "FR";
  if (["suisse", "switzerland", "ch", "schweiz", "svizzera"].includes(country)) return "CH";
  return country.length ? country : null;
}

export function matchCandidateToJob(candidate: MatchingCandidate, job: MatchingJob): MatchingResult {
  const candidateSkills = new Set(toSkills(candidate.skills));
  const requiredSkills = [...new Set(toSkills(job.requiredSkills))];
  const matchedSkills = requiredSkills.filter(
    (skill) => candidateSkills.has(skill) || [...candidateSkills].some((candidateSkill) => candidateSkill.includes(skill) || skill.includes(candidateSkill))
  );
  const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));

  const skillScore = requiredSkills.length ? Math.round((matchedSkills.length / requiredSkills.length) * 50) : 25;
  const requiredYears = job.requiredExperienceYears ?? 0;
  const candidateYears = candidate.experienceYears ?? 0;
  const experienceScore = requiredYears <= 0 ? 20 : Math.min(20, Math.round((candidateYears / requiredYears) * 20));

  const contextWords = keywordContext(job);
  const candidateText = normalize([candidate.headline, candidate.bio, candidate.location, candidate.country].filter(Boolean).join(" "));
  const contextHits = contextWords.filter((word) => candidateText.includes(word)).length;
  const contextScore = contextWords.length ? Math.min(15, Math.round((contextHits / contextWords.length) * 15)) : 5;

  let categoryScore = 0;
  let categoryMatchLevel: "EXACT_SUBCATEGORY" | "PARENT_CATEGORY" | "NONE" = "NONE";

  const primaryCode = candidate.primaryCategoryCode ? normalize(candidate.primaryCategoryCode) : null;
  const parentJobCatCode = job.categoryCode ? normalize(job.categoryCode) : null;
  const jobSubCatCode = job.subCategoryCode ? normalize(job.subCategoryCode) : null;

  // Filter candidate subcategory codes to strictly exclude primaryCategoryCode
  const candSubCategoryCodes = new Set(
    toSkills(candidate.subCategoryCodes).filter((code) => !primaryCode || code !== primaryCode)
  );

  // Exact subcategory match requires an explicit subcategory on the job that is NOT equal to primary or parent category
  const isSubCategoryMatch = Boolean(
    jobSubCatCode &&
    jobSubCatCode !== parentJobCatCode &&
    jobSubCatCode !== primaryCode &&
    candSubCategoryCodes.has(jobSubCatCode)
  );

  if (isSubCategoryMatch) {
    categoryScore = 15;
    categoryMatchLevel = "EXACT_SUBCATEGORY";
  } else if (parentJobCatCode && primaryCode && primaryCode === parentJobCatCode) {
    categoryScore = 8;
    categoryMatchLevel = "PARENT_CATEGORY";
  }

  // Cross-border fit is a verification signal, not an eligibility decision.
  // Never infer work authorization, commute, language or permit eligibility.
  const candidateCountry = normalizeCountry(candidate.country);
  const jobCountry = normalizeCountry(job.country);
  const countryFit: MatchingResult["countryFit"] = !candidateCountry || !jobCountry
    ? "UNKNOWN"
    : candidateCountry === jobCountry
      ? "SAME_COUNTRY"
      : [candidateCountry, jobCountry].sort().join("") === "CHFR"
        ? "FRANCE_SWITZERLAND_CROSS_BORDER"
        : "OTHER_CROSS_BORDER";

  const score = Math.max(0, Math.min(100, skillScore + experienceScore + contextScore + categoryScore));

  const categoryReason =
    categoryMatchLevel === "EXACT_SUBCATEGORY"
      ? "Correspondance exacte de sous-catégorie métier."
      : categoryMatchLevel === "PARENT_CATEGORY"
      ? "Correspondance au niveau de la catégorie parent."
      : "Aucune correspondance de sous-catégorie enregistrée.";

  const reasons = [
    matchedSkills.length ? `${matchedSkills.length} compétence(s) requise(s) correspondent au profil.` : "Aucune compétence requise n'a encore été confirmée.",
    requiredYears > 0 ? `Expérience détectée : ${candidateYears} an(s), cible : ${requiredYears} an(s).` : "Aucun seuil d'expérience n'est défini sur l'offre.",
    categoryReason,
    contextHits ? `${contextHits} élément(s) de contexte de l'offre sont retrouvés dans le profil.` : "Peu d'éléments de contexte sont encore disponibles pour le profil.",
  ];

  if (countryFit === "FRANCE_SWITZERLAND_CROSS_BORDER") {
    reasons.push("Mobilité France–Suisse à confirmer : permis/autorisation de travail, lieu de résidence, trajet, langue et conditions contractuelles ne sont pas déduits automatiquement.");
  } else if (countryFit === "UNKNOWN") {
    reasons.push("Pays du candidat ou de l’entreprise manquant : vérifier la mobilité et les conditions de travail avant présentation.");
  } else if (countryFit === "OTHER_CROSS_BORDER") {
    reasons.push("Recrutement transfrontalier détecté : vérifier droit au travail, mobilité, langue et conditions locales avant présentation.");
  }

  return { score, skillScore, experienceScore, contextScore, categoryScore, matchedSkills, missingSkills, reasons, categoryMatchLevel, countryFit };
}
