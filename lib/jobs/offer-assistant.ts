import { JobAnalysis } from "./analyzer";

export type StructuredJobOfferResult = {
  title: string;
  structuredDescription: string;
  missions: string[];
  mandatorySkills: string[];
  desiredSkills: string[];
  requiredExperienceYears: number | null;
  location: string | null;
  contractType: string | null;
  remotePolicy: "PRESENTIEL" | "HYBRIDE" | "TELETRAVAIL" | "NON_SPECIFIE";
  languages: string[];
  clarificationQuestions: string[];
  missingElements: string[];
};

export function structureAndAssistJobOffer(input: {
  title: string;
  rawDescription?: string | null;
  existingAnalysis?: JobAnalysis | null;
}): StructuredJobOfferResult {
  const title = input.title.trim();
  const desc = (input.rawDescription || input.existingAnalysis?.description || "").trim();
  const lines = desc.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const missions = lines.map((line) => line.replace(/^[•*\-]\s*/, "")).filter((line) => /^[•*\-]\s*/.test(lines.find((source) => source.replace(/^[•*\-]\s*/, "") === line) ?? ""));
  const actualMissions = missions.length ? [...new Set(missions)] : [];
  const rawSkills = Array.isArray(input.existingAnalysis?.skills) ? input.existingAnalysis!.skills.filter((s): s is string => typeof s === "string") : [];
  const mandatorySkills: string[] = [];
  const desiredSkills: string[] = [];
  for (const skill of rawSkills) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const mandatory = new RegExp(`(?:indispensable|obligatoire|exigé|exigée|requis|requise)[^.!?]{0,80}${escaped}| ${escaped}[^.!?]{0,50}(?:indispensable|obligatoire|exigé|exigée|requis|requise)`, "i").test(desc);
    (mandatory ? mandatorySkills : desiredSkills).push(skill);
  }

  const remotePolicy: StructuredJobOfferResult["remotePolicy"] =
    /télétravail\s*total|full\s*remote/i.test(desc) ? "TELETRAVAIL" :
    /hybride|partiel|jours?\s+de\s+télétravail/i.test(desc) ? "HYBRIDE" :
    /présentiel|sur\s+site/i.test(desc) ? "PRESENTIEL" : "NON_SPECIFIE";
  const languages = [...new Set((desc.match(/\b(?:anglais|français|allemand|espagnol|italien|néerlandais|arabe)\b(?:\s+(?:courant|professionnel|intermédiaire|notions))?/gi) ?? []).map((s) => s.trim()))];
  const missingElements: string[] = [];
  const clarificationQuestions: string[] = [];
  if (!actualMissions.length) { missingElements.push("Missions détaillées non identifiées."); clarificationQuestions.push("Quelles sont les missions et responsabilités principales du poste ?"); }
  if (!mandatorySkills.length) { missingElements.push("Compétences indispensables non précisées."); clarificationQuestions.push("Quelles compétences sont réellement obligatoires pour ce poste ?"); }
  if (!/(?:salaire|rémunération|k€|€\s*(?:\/|par)\s*an|brut)/i.test(desc)) { missingElements.push("Rémunération non renseignée."); clarificationQuestions.push("Quelle rémunération est prévue, si elle est définie ?"); }
  if (remotePolicy === "NON_SPECIFIE") { missingElements.push("Organisation du travail non précisée."); clarificationQuestions.push("Le poste est-il en présentiel, hybride ou en télétravail ?"); }
  const sections = [
    `## ${title}`,
    desc ? `### Description fournie\n${desc}` : "",
    actualMissions.length ? `### Missions mentionnées\n${actualMissions.map((m) => `- ${m}`).join("\n")}` : "",
    mandatorySkills.length ? `### Compétences obligatoires mentionnées\n${mandatorySkills.map((s) => `- ${s}`).join("\n")}` : "",
    desiredSkills.length ? `### Compétences également mentionnées (statut à confirmer)\n${desiredSkills.map((s) => `- ${s}`).join("\n")}` : "",
  ].filter(Boolean);
  return {
    title,
    structuredDescription: sections.join("\n\n"),
    missions: actualMissions,
    mandatorySkills,
    desiredSkills,
    requiredExperienceYears: input.existingAnalysis?.experienceYears ?? null,
    location: input.existingAnalysis?.location ?? null,
    contractType: input.existingAnalysis?.missionType ?? null,
    remotePolicy,
    languages,
    clarificationQuestions: [...new Set(clarificationQuestions)].slice(0, 5),
    missingElements,
  };
}
