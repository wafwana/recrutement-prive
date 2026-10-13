import test from "node:test";
import assert from "node:assert/strict";
import { selectBatchWindow } from "@/lib/sourcing/batch-window";

test("CV rematch windows paginate through candidate pools larger than the former 1000-row cap", () => {
  const total = 2405;
  const first = selectBatchWindow(total, 0, 10);
  assert.deepEqual(first, { skip: 0, take: 10, nextOffset: 10 });

  const middle = selectBatchWindow(total, 1000, 10);
  assert.deepEqual(middle, { skip: 1000, take: 10, nextOffset: 1010 });

  const final = selectBatchWindow(total, 2400, 10);
  assert.deepEqual(final, { skip: 2400, take: 5, nextOffset: 0 });
});

test("CV rematch windows clamp invalid limits and normalize offsets safely", () => {
  assert.deepEqual(selectBatchWindow(0, 7, 10), { skip: 0, take: 0, nextOffset: 0 });
  assert.deepEqual(selectBatchWindow(5, -1, 2), { skip: 4, take: 1, nextOffset: 0 });
  assert.deepEqual(selectBatchWindow(5, 9, 2), { skip: 4, take: 1, nextOffset: 0 });
  assert.deepEqual(selectBatchWindow(5, 0, 0), { skip: 0, take: 0, nextOffset: 0 });
});
