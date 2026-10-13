import test from "node:test";
import assert from "node:assert/strict";
import { mergeEnterpriseCandidateMatches } from "@/lib/sourcing/enterprise-candidate-matches";

function match(candidateId: string, score: number) {
  return {
    candidateId,
    score,
    matchedSkills: ["TypeScript"],
    missingSkills: [],
    categoryMatchLevel: "EXACT",
    reasons: ["Synthetic fixture"],
  };
}

test("enterprise sourcing merges candidate batches into a deduplicated global top 20", () => {
  const existing = Array.from({ length: 20 }, (_, i) => match(`candidate-${i}`, 100 - i));
  const incoming = [
    match("candidate-4", 110),
    match("candidate-new-a", 105),
    match("candidate-new-b", 75),
  ];
  const merged = mergeEnterpriseCandidateMatches(existing, incoming);

  assert.equal(merged.length, 20);
  assert.equal(merged[0]?.candidateId, "candidate-4");
  assert.equal(merged[0]?.score, 110);
  assert.equal(merged.some((item) => item.candidateId === "candidate-new-a"), true);
  assert.equal(merged.some((item) => item.candidateId === "candidate-new-b"), false);
  assert.equal(new Set(merged.map((item) => item.candidateId)).size, 20);
});

test("enterprise sourcing refreshes duplicate candidates and ignores malformed persisted entries", () => {
  const merged = mergeEnterpriseCandidateMatches([
    { candidateId: "candidate-a", score: 20, matchedSkills: ["Old"], missingSkills: [], categoryMatchLevel: "PARTIAL", reasons: [] },
    { candidateId: "", score: 99 },
    { candidateId: "bad-score", score: "100" },
    null,
  ], [match("candidate-a", 35)], 5);

  assert.deepEqual(merged.map((item) => [item.candidateId, item.score]), [["candidate-a", 35]]);
  assert.deepEqual(merged[0]?.matchedSkills, ["TypeScript"]);
});

test("enterprise sourcing can clear the match list when the candidate pool is empty", () => {
  assert.deepEqual(mergeEnterpriseCandidateMatches([], [], 20), []);
});

test("enterprise sourcing removes a stale match when a reevaluated candidate falls outside the batch top 20", () => {
  const existing = [match("candidate-a", 95), match("candidate-b", 80)];
  const merged = mergeEnterpriseCandidateMatches(existing, [match("candidate-b", 85)], 20, ["candidate-a", "candidate-b"]);

  assert.deepEqual(merged.map((item) => [item.candidateId, item.score]), [["candidate-b", 85]]);
});
