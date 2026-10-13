import assert from "node:assert/strict";
import test from "node:test";
import { shouldPreserveSourcedCandidateStatus } from "../lib/sourcing/candidate-status";

test("preserves human-reviewed and terminal sourcing states", () => {
  for (const status of ["REVIEWING", "VALIDATED", "CONTACTED", "REJECTED", "ARCHIVED"]) {
    assert.equal(shouldPreserveSourcedCandidateStatus(status), true, status);
  }
});

test("allows automatic refresh only for non-reviewed states", () => {
  for (const status of ["DETECTED", "MATCHED", "A_QUALIFIER", "UNKNOWN"]) {
    assert.equal(shouldPreserveSourcedCandidateStatus(status), false, status);
  }
});
