const HUMAN_DECISION_STATUSES = new Set([
  "REVIEWING",
  "VALIDATED",
  "CONTACTED",
  "REJECTED",
  "ARCHIVED",
]);

const NON_REMATCHABLE_STATUSES = new Set(["REJECTED", "ARCHIVED"]);

/** Prevent automated sourcing refreshes from overwriting a human/workflow decision. */
export function shouldPreserveSourcedCandidateStatus(status: string): boolean {
  return HUMAN_DECISION_STATUSES.has(status);
}

/** Recompute technical match scores unless a human explicitly rejected or archived the profile. */
export function shouldRematchSourcedCandidate(status: string): boolean {
  return !NON_REMATCHABLE_STATUSES.has(status);
}
