import assert from "node:assert/strict";
import test from "node:test";
import { shouldPreserveSourcedCandidateStatus, shouldRematchSourcedCandidate } from "../lib/sourcing/candidate-status";

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

test("rematches technical scores for reviewed candidates but excludes rejected or archived profiles", () => {
  for (const status of ["DETECTED", "MATCHED", "REVIEWING", "VALIDATED", "CONTACTED", "A_QUALIFIER", "UNKNOWN"]) {
    assert.equal(shouldRematchSourcedCandidate(status), true, status);
  }

  for (const status of ["REJECTED", "ARCHIVED"]) {
    assert.equal(shouldRematchSourcedCandidate(status), false, status);
  }
});
