export type ContractProfile = {
  companyCountry: string;
  providerCountry: string;
  candidateCountry?: string;
  performanceCountry?: string;
  serviceType: "RECRUITMENT" | "CONSULTING" | "OTHER";
  chosenLaw?: string;
  contractLanguage?: string;
};

export type LegalFrameworkResult = {
  lawSelection: "PARTIES_CHOICE" | "REQUIRES_ANALYSIS";
  selectedLaw?: string;
  mandatoryRulesReview: true;
  jurisdictionReview: true;
  taxReview: true;
  dataTransferReview: true;
  escalationRequired: boolean;
  reasons: string[];
};

/**
 * Conservative contract-framework helper.
 *
 * It intentionally does NOT give a definitive legal opinion. It identifies
 * which checks the contract workflow must perform before a document is signed.
 * The EU baseline follows Rome I: parties may choose the applicable law, while
 * mandatory rules can still apply in relevant circumstances.
 */
export function assessInternationalContract(
  profile: ContractProfile,
): LegalFrameworkResult {
  const reasons: string[] = [];
  const crossBorder =
    profile.companyCountry !== profile.providerCountry ||
    Boolean(profile.candidateCountry && profile.candidateCountry !== profile.providerCountry) ||
    Boolean(profile.performanceCountry && profile.performanceCountry !== profile.providerCountry);

  if (profile.chosenLaw) {
    reasons.push("A contractual choice of law has been declared and must be checked against mandatory rules.");
  } else if (profile.serviceType === "RECRUITMENT" || profile.serviceType === "CONSULTING") {
    reasons.push("No contractual choice of law was declared; the applicable-law analysis must be completed before signature.");
  }

  if (crossBorder) {
    reasons.push("The relationship contains a cross-border element; jurisdiction and mandatory local rules require review.");
    reasons.push("Tax/VAT treatment must be assessed from the parties, service and countries involved.");
    reasons.push("Candidate data may involve an international transfer and requires a separate data-protection review.");
  }

  if (profile.candidateCountry && profile.candidateCountry !== profile.providerCountry) {
    reasons.push("The candidate is in a different country; recruitment/employment rules must not be inferred from the contract law alone.");
  }

  return {
    lawSelection: profile.chosenLaw ? "PARTIES_CHOICE" : "REQUIRES_ANALYSIS",
    selectedLaw: profile.chosenLaw,
    mandatoryRulesReview: true,
    jurisdictionReview: true,
    taxReview: true,
    dataTransferReview: true,
    escalationRequired: crossBorder || !profile.chosenLaw,
    reasons,
  };
}
