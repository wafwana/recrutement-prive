const HUMAN_DECISION_STATUSES = new Set([
  "REVIEWING",
  "VALIDATED",
  "CONTACTED",
  "REJECTED",
  "ARCHIVED",
]);

/** Prevent automated sourcing refreshes from overwriting a human/workflow decision. */
export function shouldPreserveSourcedCandidateStatus(status: string): boolean {
  return HUMAN_DECISION_STATUSES.has(status);
}
