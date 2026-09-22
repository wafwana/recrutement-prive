type JsonList = unknown;

function skills(value: JsonList): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,;|\n]/).map((v) => v.trim().toLowerCase()).filter(Boolean);
  return [];
}

function words(value: string | null | undefined): string[] {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9+#.-]+/).filter((v) => v.length > 2);
}

export function matchCompanyJobToExternal(companyJob: {
  title: string;
  description: string | null;
  requiredSkills: JsonList;
  requiredExperienceYears: number | null;
  location: string | null;
  categoryCode?: string | null;
  subCategoryCode?: string | null;
}, external: {
  title: string;
  description: string | null;
  skills: JsonList;
  experienceYears: number | null;
  country: string | null;
  city: string | null;
  categoryCode: string | null;
  subCategoryCode: string | null;
  analysis?: { inPlatformScope?: boolean } | null;
}) {
  if (external.analysis?.inPlatformScope === false) {
    return { score: 0, matchedSkills: [], missingSkills: skills(companyJob.requiredSkills), reasons: ["Offre externe hors périmètre métier de la plateforme."] };
  }
  const required = skills(companyJob.requiredSkills);
  const externalSkills = skills(external.skills);
  const matchedSkills = required.filter((skill) => externalSkills.includes(skill) || externalSkills.some((other) => other.includes(skill) || skill.includes(other)));
  const missingSkills = required.filter((skill) => !matchedSkills.includes(skill));
  const skillScore = required.length ? Math.round((matchedSkills.length / required.length) * 55) : 25;

  const exp = companyJob.requiredExperienceYears ?? 0;
  const extExp = external.experienceYears ?? 0;
  const experienceScore = exp <= 0 ? 15 : Math.min(15, Math.round((extExp / exp) * 15));

  const companyWords = new Set([...words(companyJob.title), ...words(companyJob.description)]);
  const externalWords = new Set([...words(external.title), ...words(external.description)]);
  const contextHits = [...companyWords].filter((word) => externalWords.has(word)).length;
  const contextScore = companyWords.size ? Math.min(15, Math.round((contextHits / Math.min(companyWords.size, 8)) * 15)) : 5;

  let categoryScore = 0;
  if (companyJob.subCategoryCode && external.subCategoryCode && companyJob.subCategoryCode === external.subCategoryCode) categoryScore = 15;
  else if (companyJob.categoryCode && external.categoryCode && companyJob.categoryCode === external.categoryCode) categoryScore = 9;

  const locationText = `${companyJob.location ?? ""} ${external.country ?? ""} ${external.city ?? ""}`.toLowerCase();
  const locationScore = companyJob.location && locationText.includes(companyJob.location.toLowerCase()) ? 5 : 0;
  const score = Math.min(100, skillScore + experienceScore + contextScore + categoryScore + locationScore);
  return {
    score,
    matchedSkills,
    missingSkills,
    reasons: [
      `${matchedSkills.length} compétence(s) de l'offre entreprise retrouvée(s).`,
      exp > 0 ? `Expérience externe détectée : ${extExp} an(s), cible : ${exp} an(s).` : "Aucun seuil d'expérience entreprise défini.",
      categoryScore >= 15 ? "Même sous-catégorie métier." : categoryScore >= 9 ? "Même catégorie métier." : "Catégorie métier à confirmer.",
      locationScore ? "La localisation est cohérente avec le besoin." : "La localisation doit être vérifiée.",
    ],
  };
}
