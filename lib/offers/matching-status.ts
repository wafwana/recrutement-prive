export type OfferMatchingState =
  | "SEARCHING"
  | "MATCH_DETECTED"
  | "PENDING_HUMAN_VALIDATION"
  | "NO_MATCH"
  | "OTHER";

export type OfferMatchingStatusInfo = {
  code: OfferMatchingState;
  label: string;
  colorClass: string;
  badgeStyle: string;
};

export function getOfferMatchingStatus(offer: {
  status: string;
  rawData?: unknown;
}): OfferMatchingStatusInfo {
  const status = offer.status;
  const rawObj =
    offer.rawData && typeof offer.rawData === "object" && !Array.isArray(offer.rawData)
      ? (offer.rawData as Record<string, unknown>)
      : null;
  const matchingObj =
    rawObj?.matching && typeof rawObj.matching === "object" && !Array.isArray(rawObj.matching)
      ? (rawObj.matching as Record<string, unknown>)
      : null;

  // 1. Engine actively searching for candidates for this offer
  if (status === "QUALIFYING" || matchingObj?.isSearching === true) {
    return {
      code: "SEARCHING",
      label: "Recherche de candidats",
      colorClass: "text-[#F97316]",
      badgeStyle: "border-[#F97316]/50 text-[#F97316] bg-[#F97316]/10",
    };
  }

  // 2, 3, 4. Matching processing completed
  if (status === "MATCHING" || matchingObj?.matchedAt) {
    const matchCount =
      typeof matchingObj?.matchCount === "number"
        ? matchingObj.matchCount
        : Array.isArray(matchingObj?.topMatches)
        ? matchingObj.topMatches.length
        : 0;

    if (matchCount === 0) {
      // 4. Treatment finished without correspondence
      return {
        code: "NO_MATCH",
        label: "Aucun matching trouvé",
        colorClass: "text-white/40",
        badgeStyle: "border-white/20 text-white/40 bg-white/5",
      };
    }

    // Candidate match(es) detected (matchCount > 0)
    const isHumanValidated = Boolean(
      matchingObj?.humanValidated === true ||
        matchingObj?.isValidated === true ||
        matchingObj?.validationStatus === "VALIDATED"
    );

    if (isHumanValidated) {
      // 2. Engine finished and detected at least one match + human validated
      return {
        code: "MATCH_DETECTED",
        label: "Matching détecté",
        colorClass: "text-emerald-400",
        badgeStyle: "border-emerald-500/50 text-emerald-400 bg-emerald-500/10",
      };
    } else {
      // 3. Match found and awaiting human validation
      return {
        code: "PENDING_HUMAN_VALIDATION",
        label: "À valider",
        colorClass: "text-[#c7a15a]",
        badgeStyle: "border-[#c7a15a]/50 text-[#c7a15a] bg-[#c7a15a]/10",
      };
    }
  }

  // Standard fallback labels
  const standardLabels: Record<string, { label: string; colorClass: string; badgeStyle: string }> = {
    DETECTED: { label: "Nouvelle", colorClass: "text-white/70", badgeStyle: "border-white/20 text-white/70" },
    A_QUALIFIER: { label: "À qualifier", colorClass: "text-[#F97316]", badgeStyle: "border-[#F97316]/50 text-[#F97316]" },
    QUALIFIED: { label: "Qualifiée", colorClass: "text-sky-400", badgeStyle: "border-sky-500/50 text-sky-400" },
    CONTACTED: { label: "Contactée", colorClass: "text-purple-400", badgeStyle: "border-purple-500/50 text-purple-400" },
    FILLED: { label: "Pourvue", colorClass: "text-emerald-400", badgeStyle: "border-emerald-500/50 text-emerald-400" },
    ARCHIVED: { label: "Archivée", colorClass: "text-white/30", badgeStyle: "border-white/20 text-white/30" },
    REJECTED: { label: "Écartée", colorClass: "text-rose-400/70", badgeStyle: "border-rose-500/30 text-rose-400/70" },
  };

  const std = standardLabels[status] || {
    label: status,
    colorClass: "text-[#c7a15a]",
    badgeStyle: "border-[#c7a15a]/50 text-[#c7a15a]",
  };

  return {
    code: "OTHER",
    label: std.label,
    colorClass: std.colorClass,
    badgeStyle: std.badgeStyle,
  };
}
