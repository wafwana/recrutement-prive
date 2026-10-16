import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { selectNextSource } from "../lib/sourcing/source-rotation";

test("global-jobs source rotation selects one source per invocation without starving later sources", () => {
  const sources = ["https://source-a.example/jobs", "https://source-b.example/jobs", "https://source-c.example/jobs"];
  const first = selectNextSource(sources, 0);
  assert.equal(first.source, sources[0]);
  assert.equal(first.index, 0);
  assert.equal(first.nextOffset, 1);
  assert.equal(first.total, 3);

  const second = selectNextSource(sources, first.nextOffset);
  const third = selectNextSource(sources, second.nextOffset);
  const wrapped = selectNextSource(sources, third.nextOffset);
  assert.equal(second.source, sources[1]);
  assert.equal(third.source, sources[2]);
  assert.equal(wrapped.source, sources[0]);
  assert.equal(wrapped.nextOffset, 1);
});

test("global-jobs source rotation safely handles no sources and normalized offsets", () => {
  assert.deepEqual(selectNextSource([], 10), { source: null, index: null, nextOffset: 0, total: 0 });
  assert.equal(selectNextSource(["a", "b", "c"], -1).source, "c");
  assert.equal(selectNextSource(["a", "b", "c"], 100).source, "b");
});

test("global-jobs cron uses a persistent source cursor and bounds feed processing per invocation", () => {
  const route = fs.readFileSync("app/api/cron/global-jobs/route.ts", "utf8");
  assert.match(route, /sourcing:global-jobs-source-rotation/);
  assert.match(route, /readBatchOffset\(sourceRotationKey, sources\.length\)/);
  assert.match(route, /selectNextSource\(sources, sourceOffset\)/);
  assert.match(route, /ingestGlobalJobs\(rotation\.source, owner\.id, \{ maxItems: 2 \}\)/);
  assert.match(route, /writeBatchOffset\(sourceRotationKey, rotation\.nextOffset, rotation\.total\)/);
  assert.doesNotMatch(route, /for\s*\(\s*const source of sources\s*\)/);
});
