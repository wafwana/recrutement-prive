import test from "node:test";
import assert from "node:assert/strict";
import { selectEnterpriseOfferBatch } from "@/lib/sourcing/enterprise-batch";

test("enterprise batch cursor advances across scanned offers even when caller filters them out", () => {
  const offers = [
    { id: "fr-1", country: "France" },
    { id: "in-1", country: "India" },
    { id: "fr-2", country: "France" },
    { id: "in-2", country: "India" },
    { id: "fr-3", country: "France" },
  ];
  const first = selectEnterpriseOfferBatch(offers, 0, 2);
  const selected = first.batch.filter((offer) => offer.country === "India");
  assert.deepEqual(first.batch.map((offer) => offer.id), ["fr-1", "in-1"]);
  assert.deepEqual(selected.map((offer) => offer.id), ["in-1"]);
  assert.equal(first.nextOffset, 2);

  const second = selectEnterpriseOfferBatch(offers, first.nextOffset, 2);
  assert.deepEqual(second.batch.map((offer) => offer.id), ["fr-2", "in-2"]);
  assert.equal(second.nextOffset, 4);
});

test("enterprise batch cursor wraps safely and processes every offer once per cycle", () => {
  const offers = ["a", "b", "c", "d", "e"];
  const first = selectEnterpriseOfferBatch(offers, 4, 2);
  assert.deepEqual(first.batch, ["e", "a"]);
  assert.equal(first.nextOffset, 1);
  const second = selectEnterpriseOfferBatch(offers, first.nextOffset, 2);
  assert.deepEqual(second.batch, ["b", "c"]);
  assert.equal(second.nextOffset, 3);
  const third = selectEnterpriseOfferBatch(offers, second.nextOffset, 2);
  assert.deepEqual(third.batch, ["d", "e"]);
  assert.equal(third.nextOffset, 0);
});

test("enterprise batch handles empty feeds and invalid limits", () => {
  assert.deepEqual(selectEnterpriseOfferBatch([], 7, 10), { batch: [], nextOffset: 0 });
  assert.deepEqual(selectEnterpriseOfferBatch(["a", "b"], 0, 0), { batch: [], nextOffset: 0 });
});

test("enterprise batch clamps negative and oversized offsets", () => {
  assert.deepEqual(selectEnterpriseOfferBatch(["a", "b", "c"], -1, 1), { batch: ["c"], nextOffset: 0 });
  assert.deepEqual(selectEnterpriseOfferBatch(["a", "b", "c"], 10, 1), { batch: ["b"], nextOffset: 2 });
});


test("enterprise sourcing source-pair cursor rotates in bounded groups without starving later companies", () => {
  const pairs = [
    "company-a:source-a",
    "company-a:source-b",
    "company-b:source-a",
    "company-b:source-b",
    "company-c:source-a",
  ];
  const first = selectEnterpriseOfferBatch(pairs, 0, 2);
  assert.deepEqual(first.batch, ["company-a:source-a", "company-a:source-b"]);
  assert.equal(first.nextOffset, 2);

  const second = selectEnterpriseOfferBatch(pairs, first.nextOffset, 2);
  assert.deepEqual(second.batch, ["company-b:source-a", "company-b:source-b"]);
  assert.equal(second.nextOffset, 4);

  const third = selectEnterpriseOfferBatch(pairs, second.nextOffset, 2);
  assert.deepEqual(third.batch, ["company-c:source-a", "company-a:source-a"]);
  assert.equal(third.nextOffset, 1);
});
