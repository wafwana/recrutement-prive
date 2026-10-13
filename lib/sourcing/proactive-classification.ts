import { getStrongProfilesForProfession } from "@/lib/taxonomy/strong-profiles";

type TaxonomyProfession = { code: string; name: { fr: string } };
type TaxonomySector = {
  code: string;
  name: { fr: string };
  subcategories: TaxonomyProfession[];
};

export type ProactiveClassification = {
  targetProfession?: TaxonomyProfession;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  score: number;
  rationale: string;
  isClassified: boolean;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Classifies only from evidence in the public headline/declared skills.
 * The search query itself is never considered proof of a candidate's profession.
 */
export function classifyProactiveCandidate(input: {
  sector: TaxonomySector;
  profession?: TaxonomyProfession;
  headline?: string | null;
  skills?: unknown;
}): ProactiveClassification {
  const headline = normalize(input.headline || "");
  const candidateSkills = Array.isArray(input.skills)
    ? input.skills.filter((item): item is string => typeof item === "string").map(normalize)
    : [];
  const candidates = input.profession ? [input.profession] : input.sector.subcategories;

  const matched = candidates
    .map((profession) => {
      const aliases = [profession.name.fr, ...getStrongProfilesForProfession(input.sector.code, profession.code).map((profile) => profile.title)]
        .map(normalize)
        .filter(Boolean);
      return {
        profession,
        titleMatch: aliases.some((alias) => headline.includes(alias)),
        skillMatch: candidateSkills.some((skill) => aliases.some((alias) => skill === alias || skill.includes(alias))),
      };
    })
    .find((candidate) => candidate.titleMatch || candidate.skillMatch);

  const titleMatch = Boolean(matched?.titleMatch);
  const skillMatch = Boolean(matched?.skillMatch);
  const confidence = titleMatch ? "HIGH" : skillMatch ? "MEDIUM" : "LOW";
  const targetProfession = matched?.profession;
  const isClassified = confidence !== "LOW" && Boolean(targetProfession);
  const rationale = titleMatch
    ? "Le titre public du profil correspond au métier recherché."
    : skillMatch
      ? "Une compétence déclarée correspond au métier recherché ; CV non vérifié."
      : "Correspondance insuffisante sur les champs publics disponibles : à qualifier.";

  return {
    targetProfession,
    confidence,
    score: titleMatch ? 90 : skillMatch ? 65 : 25,
    rationale,
    isClassified,
  };
}
