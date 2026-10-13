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

/**
 * Merge per-offer candidate batches into one ranked top-20 list.
 * Incoming matches replace prior entries for the same candidate so profile
 * changes are reflected when the offer's cursor revisits that candidate.
 */
export function mergeEnterpriseCandidateMatches(
  existing: unknown,
  incoming: EnterpriseCandidateMatch[],
  limit = 20,
): EnterpriseCandidateMatch[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 20;
  if (safeLimit === 0) return [];

  const byCandidate = new Map<string, EnterpriseCandidateMatch>();
  if (Array.isArray(existing)) {
    for (const item of existing) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const record = item as Record<string, unknown>;
      if (typeof record.candidateId !== "string" || !record.candidateId.trim()) continue;
      if (typeof record.score !== "number" || !Number.isFinite(record.score)) continue;
      byCandidate.set(record.candidateId, {
        candidateId: record.candidateId,
        score: record.score,
        matchedSkills: stringArray(record.matchedSkills),
        missingSkills: stringArray(record.missingSkills),
        categoryMatchLevel: typeof record.categoryMatchLevel === "string" ? record.categoryMatchLevel : "UNKNOWN",
        reasons: stringArray(record.reasons),
      });
    }
  }

  for (const item of incoming) {
    if (!item.candidateId || !Number.isFinite(item.score)) continue;
    byCandidate.set(item.candidateId, {
      ...item,
      matchedSkills: stringArray(item.matchedSkills),
      missingSkills: stringArray(item.missingSkills),
      reasons: stringArray(item.reasons),
    });
  }

  return [...byCandidate.values()]
    .sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId))
    .slice(0, safeLimit);
}
