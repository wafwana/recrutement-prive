export function shouldPreserveSourcedCandidateStatus(status: string): boolean {
  // Only the initial DETECTED state may be refreshed automatically.
  // REVIEWING, VALIDATED, CONTACTED and REJECTED are human/workflow decisions.
  return status !== "DETECTED";
}
