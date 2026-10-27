export type MatchingCandidate = {
  skills?: unknown;
  experienceYears?: number | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  country?: string | null;
  primaryCategoryCode?: string | null;
  subCategoryCodes?: unknown;
  education?: unknown;
  certifications?: unknown;
  languages?: unknown;
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
  requiredEducation?: unknown;
  requiredLanguages?: unknown;
};

export type CriterionDetail = {
  criterion: string;
  kind: "SKILL" | "EXPERIENCE" | "CATEGORY" | "LOCATION" | "EDUCATION" | "LANGUAGE";
  status: "SATISFIED" | "PARTIALLY_SATISFIED" | "MISSING" | "UNKNOWN";
  evidence: string | null;
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
  criteriaDetails: CriterionDetail[];
  evidenceProofs: string[];
  strengths: string[];
  risksAndReserves: string[];
  calculatedAt: string;
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

function toRawList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string").map((s) => s.trim()).filter(Boolean);
  if (value && typeof value === "object") return Object.values(value).filter((v): v is string => typeof v === "string").map((s) => s.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,;\n|]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function keywordContext(job: MatchingJob): string[] {
  return [job.title, job.description, job.location].filter((v): v is string => Boolean(v)).flatMap((v) => normalize(v).split(/[^a-z0-9+#.-]+/).filter((x) => x.length >= 4));
}

function countryFromLocation(value: string | null | undefined): string | null {
  if (!value) return null;
  const parts = value.split(/[,|]/).map((part) => part.trim()).filter(Boolean);
  for (const part of parts.reverse()) {
    const normalized = normalizeCountry(part);
    if (normalized === "FR" || normalized === "CH") return normalized;
  }
  return null;
}

function normalizeCountry(value: string | null | undefined): string | null {
  if (!value) return null;
  const country = normalize(value).replace(/[^a-z]/g, "");
  if (["france", "fr", "frenchrepublic"].includes(country)) return "FR";
  if (["suisse", "switzerland", "ch", "schweiz", "svizzera"].includes(country)) return "CH";
  return country.length ? country : null;
}

export function matchCandidateToJob(candidate: MatchingCandidate, job: MatchingJob): MatchingResult {
  const candidateRawSkills = toRawList(candidate.skills);
  const candidateNormalizedSkills = new Set(toSkills(candidate.skills));
  const rawRequiredSkills = toRawList(job.requiredSkills);
  const requiredSkills = [...new Set(toSkills(job.requiredSkills))];

  const matchedSkillsRaw: string[] = [];
  const matchedSkillsNormalized: string[] = [];

  for (let i = 0; i < requiredSkills.length; i += 1) {
    const reqNorm = requiredSkills[i];
    const reqRaw = rawRequiredSkills[i] || reqNorm;
    const isHit =
      candidateNormalizedSkills.has(reqNorm) ||
      [...candidateNormalizedSkills].some((cSkill) => cSkill.includes(reqNorm) || reqNorm.includes(cSkill));
    if (isHit) {
      matchedSkillsNormalized.push(reqNorm);
      matchedSkillsRaw.push(reqRaw);
    }
  }

  const missingSkills = rawRequiredSkills.filter((reqRaw) => !matchedSkillsRaw.includes(reqRaw));

  const skillScore = requiredSkills.length ? Math.round((matchedSkillsNormalized.length / requiredSkills.length) * 50) : 25;
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

  const candSubCategoryCodes = new Set(
    toSkills(candidate.subCategoryCodes).filter((code) => !primaryCode || code !== primaryCode)
  );

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

  const candidateCountry = normalizeCountry(candidate.country) ?? countryFromLocation(candidate.location);
  const jobCountry = normalizeCountry(job.country);
  const countryFit: MatchingResult["countryFit"] = !candidateCountry || !jobCountry
    ? "UNKNOWN"
    : candidateCountry === jobCountry
      ? "SAME_COUNTRY"
      : [candidateCountry, jobCountry].sort().join("") === "CHFR"
        ? "FRANCE_SWITZERLAND_CROSS_BORDER"
        : "OTHER_CROSS_BORDER";

  const score = Math.max(0, Math.min(100, skillScore + experienceScore + contextScore + categoryScore));

  const criteriaDetails: CriterionDetail[] = [];
  const evidenceProofs: string[] = [];
  const strengths: string[] = [];
  const risksAndReserves: string[] = [];

  for (const rawReq of rawRequiredSkills) {
    const isMatched = matchedSkillsRaw.includes(rawReq);
    if (isMatched) {
      const matchCandidateFact = candidateRawSkills.find((cs) => normalize(cs).includes(normalize(rawReq)) || normalize(rawReq).includes(normalize(cs))) || rawReq;
      criteriaDetails.push({
        criterion: `Compétence : ${rawReq}`,
        kind: "SKILL",
        status: "SATISFIED",
        evidence: `Présent dans le CV ("${matchCandidateFact}")`,
      });
      evidenceProofs.push(`Compétence "${rawReq}" confirmée par le CV.`);
    } else {
      criteriaDetails.push({
        criterion: `Compétence : ${rawReq}`,
        kind: "SKILL",
        status: "MISSING",
        evidence: null,
      });
      risksAndReserves.push(`Compétence requise "${rawReq}" non mentionnée explicitement dans le CV.`);
    }
  }

  if (requiredYears > 0) {
    if (candidateYears >= requiredYears) {
      criteriaDetails.push({
        criterion: `Expérience : ${requiredYears} an(s) exigé(s)`,
        kind: "EXPERIENCE",
        status: "SATISFIED",
        evidence: `${candidateYears} an(s) d'expérience documenté(s)`,
      });
      strengths.push(`Seuil d'expérience satisfait : ${candidateYears} an(s) pour ${requiredYears} an(s) requis.`);
      evidenceProofs.push(`Expérience professionnelle (${candidateYears} ans) supérieure ou égale au seuil de l'offre (${requiredYears} ans).`);
    } else if (candidateYears > 0) {
      criteriaDetails.push({
        criterion: `Expérience : ${requiredYears} an(s) exigé(s)`,
        kind: "EXPERIENCE",
        status: "PARTIALLY_SATISFIED",
        evidence: `${candidateYears} an(s) documenté(s) (cible ${requiredYears} ans)`,
      });
      risksAndReserves.push(`Expérience partielle : ${candidateYears} an(s) présentés pour ${requiredYears} an(s) demandés.`);
    } else {
      criteriaDetails.push({
        criterion: `Expérience : ${requiredYears} an(s) exigé(s)`,
        kind: "EXPERIENCE",
        status: "MISSING",
        evidence: null,
      });
      risksAndReserves.push(`Niveau d'expérience non documenté ou inférieur à l'exigence de ${requiredYears} an(s).`);
    }
  }

  if (categoryMatchLevel === "EXACT_SUBCATEGORY") {
    criteriaDetails.push({
      criterion: "Domaine / sous-catégorie métier",
      kind: "CATEGORY",
      status: "SATISFIED",
      evidence: `Sous-catégorie exacte : ${job.subCategoryCode}`,
    });
    strengths.push("Expertise métier directement alignée sur la sous-catégorie du poste.");
  } else if (categoryMatchLevel === "PARENT_CATEGORY") {
    criteriaDetails.push({
      criterion: "Domaine / secteur métier",
      kind: "CATEGORY",
      status: "PARTIALLY_SATISFIED",
      evidence: `Secteur parent : ${job.categoryCode}`,
    });
    strengths.push("Alignement sectoriel confirmé au niveau du secteur principal.");
  }

  if (countryFit === "SAME_COUNTRY") {
    criteriaDetails.push({
      criterion: "Périmètre géographique",
      kind: "LOCATION",
      status: "SATISFIED",
      evidence: `Pays identique (${candidateCountry})`,
    });
  } else if (countryFit === "FRANCE_SWITZERLAND_CROSS_BORDER") {
    criteriaDetails.push({
      criterion: "Mobilité transfrontalière France-Suisse",
      kind: "LOCATION",
      status: "PARTIALLY_SATISFIED",
      evidence: `Candidat : ${candidateCountry || "Inconnu"}, Offre : ${jobCountry || "Inconnu"}`,
    });
    risksAndReserves.push("Mobilité transfrontalière France-Suisse : permis de travail, trajet quotidien et rémunération à valider lors de l'entretien.");
  } else if (countryFit === "UNKNOWN") {
    criteriaDetails.push({
      criterion: "Localisation & mobilité",
      kind: "LOCATION",
      status: "UNKNOWN",
      evidence: null,
    });
    risksAndReserves.push("Localisation candidat ou entreprise à préciser.");
  }

  const categoryReason =
    categoryMatchLevel === "EXACT_SUBCATEGORY"
      ? "Correspondance exacte de sous-catégorie métier."
      : categoryMatchLevel === "PARENT_CATEGORY"
      ? "Correspondance au niveau de la catégorie parent."
      : "Aucune correspondance de sous-catégorie enregistrée.";

  const reasons = [
    matchedSkillsRaw.length ? `${matchedSkillsRaw.length} compétence(s) requise(s) correspondent au profil.` : "Aucune compétence requise n'a encore été confirmée.",
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

  if (candidate.headline) {
    evidenceProofs.push(`Intitulé professionnel : "${candidate.headline}"`);
  }

  return {
    score,
    skillScore,
    experienceScore,
    contextScore,
    categoryScore,
    matchedSkills: matchedSkillsRaw,
    missingSkills,
    reasons,
    categoryMatchLevel,
    countryFit,
    criteriaDetails,
    evidenceProofs,
    strengths,
    risksAndReserves,
    calculatedAt: new Date().toISOString(),
  };
}
