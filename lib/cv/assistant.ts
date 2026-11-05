import { CvAnalysis } from "./analyzer";

export type CvProfessionalTemplate = "CLASSIQUE" | "MODERNE" | "TECHNIQUE" | "CADRE" | "COMMERCIAL" | "OPERATIONNEL";

export type CvAssistantResult = {
  originalHeadline: string | null;
  improvedHeadline: string;
  improvedSummary: string;
  structuredExperiences: { title: string; company: string | null; period: string; enhancedMissions: string[]; originalEvidence: string }[];
  highlightedSkills: string[];
  detectedGaps: string[];
  clarificationQuestions: string[];
  template: CvProfessionalTemplate;
  tailoredForJobTitle?: string | null;
};

/** Reformule uniquement des faits présents dans l'analyse. Aucun intitulé, résultat ou compétence n'est ajouté. */
export function assistAndRefineCv(input: {
  analysis: CvAnalysis;
  template?: CvProfessionalTemplate;
  targetJob?: { title: string; requiredSkills?: string[] } | null;
}): CvAssistantResult {
  const { analysis, template = "MODERNE", targetJob } = input;
  const originalHeadline = analysis.headline?.trim() || null;
  const improvedHeadline = originalHeadline ?? (analysis.experiences[0]?.title?.trim() || "");
  const detectedGaps: string[] = [];
  const clarificationQuestions: string[] = [];

  if (!analysis.experiences.length) {
    detectedGaps.push("Aucune expérience détaillée n'a été détectée dans le document.");
    clarificationQuestions.push("Souhaitez-vous ajouter une ou plusieurs expériences professionnelles ?");
  }
  for (const exp of analysis.experiences) {
    if (!exp.company) {
      detectedGaps.push(`Entreprise manquante pour le poste "${exp.title}".`);
      clarificationQuestions.push(`Dans quelle entreprise avez-vous exercé le poste "${exp.title}" ?`);
    }
    if (!exp.durationYears && !exp.start && !exp.end) {
      detectedGaps.push(`Période non précisée pour "${exp.title}".`);
      clarificationQuestions.push(`Quelles étaient les dates de votre poste "${exp.title}" ?`);
    }
    if (!exp.evidence?.trim()) {
      detectedGaps.push(`Missions non détaillées pour "${exp.title}".`);
      clarificationQuestions.push(`Quelles missions avez-vous réellement réalisées dans le poste "${exp.title}" ?`);
    }
  }
  if (!analysis.skills.length) {
    detectedGaps.push("Aucune compétence explicite détectée.");
    clarificationQuestions.push("Quelles compétences souhaitez-vous déclarer ?");
  }

  const structuredExperiences = analysis.experiences.map((exp) => ({
    title: exp.title,
    company: exp.company,
    period: exp.start && exp.end ? `${exp.start} - ${exp.end}` : exp.durationYears ? `${exp.durationYears} an(s)` : "Période à préciser",
    enhancedMissions: exp.evidence?.trim() ? [exp.evidence.trim()] : [],
    originalEvidence: exp.evidence ?? "",
  }));

  const highlightedSkills = [...analysis.skills];
  if (targetJob?.requiredSkills?.length) {
    highlightedSkills.sort((a, b) => {
      const aMatch = targetJob.requiredSkills!.some((required) => a.toLocaleLowerCase().includes(required.toLocaleLowerCase()));
      const bMatch = targetJob.requiredSkills!.some((required) => b.toLocaleLowerCase().includes(required.toLocaleLowerCase()));
      return Number(bMatch) - Number(aMatch);
    });
  }

  // La synthèse reste la synthèse déclarée/analysée. Pas de texte promotionnel inventé.
  const improvedSummary = analysis.improvedSummary?.trim() || analysis.summary?.trim() || "";
  return {
    originalHeadline,
    improvedHeadline,
    improvedSummary,
    structuredExperiences,
    highlightedSkills,
    detectedGaps,
    clarificationQuestions: [...new Set(clarificationQuestions)].slice(0, 5),
    template,
    tailoredForJobTitle: targetJob?.title || null,
  };
}
