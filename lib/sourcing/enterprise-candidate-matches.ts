export type EnterpriseCandidateMatch = {
  candidateId: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  categoryMatchLevel: string;
  reasons: string[];
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function mergeEnterpriseCandidateMatches(
  existing: unknown,
  incoming: EnterpriseCandidateMatch[],
  limit = 20,
  evaluatedCandidateIds: readonly string[] = [],
): EnterpriseCandidateMatch[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 20;
  if (!safeLimit) return [];
  const evaluated = new Set(evaluatedCandidateIds);
  const byCandidate = new Map<string, EnterpriseCandidateMatch>();
  if (Array.isArray(existing)) for (const item of existing) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.candidateId !== "string" || !record.candidateId.trim() || evaluated.has(record.candidateId)) continue;
    if (typeof record.score !== "number" || !Number.isFinite(record.score)) continue;
    byCandidate.set(record.candidateId, {
      candidateId: record.candidateId, score: record.score,
      matchedSkills: stringArray(record.matchedSkills), missingSkills: stringArray(record.missingSkills),
      categoryMatchLevel: typeof record.categoryMatchLevel === "string" ? record.categoryMatchLevel : "UNKNOWN",
      reasons: stringArray(record.reasons),
    });
  }
  for (const item of incoming) if (item.candidateId && Number.isFinite(item.score)) byCandidate.set(item.candidateId, {
    ...item, matchedSkills: stringArray(item.matchedSkills), missingSkills: stringArray(item.missingSkills), reasons: stringArray(item.reasons),
  });
  return [...byCandidate.values()].sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId)).slice(0, safeLimit);
}

/**
 * Deliberately returns no company records: this repository currently has no verified
 * live registry adapter in this function. Synthetic company names must never be shown
 * as prospects. Connect a real, provenance-bearing provider before populating results.
 */
export type TargetCompanyOpportunity = {
  companyName: string;
  targetSector: string;
  geographicScope: "ZONE_DECLAREE" | "PAYS_VOISINS" | "INTERNATIONAL";
  targetCountry: string;
  source: string;
  status: "A_VERIFIER" | "QUALIFIEE";
  matchRationale: string;
};

export function identifyTargetCompaniesForUnmatchedCandidate(_input: {
  candidateId: string;
  primaryCategoryCode: string | null;
  skills: string[];
  declaredMobilityCountry?: string | null;
  languages?: string[];
  hasInternationalMobility?: boolean;
}): TargetCompanyOpportunity[] {
  return [];
}
