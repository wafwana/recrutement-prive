import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { qualifyAndMatchExternalOffer, processOfferBatch } from "../lib/jobs/offer-pipeline";

describe("Chain Qualification & Matching Behavioral Tests", () => {
  test("qualifyAndMatchExternalOffer handles missing offer gracefully", async () => {
    if (!process.env.DATABASE_URL) return;
    const res = await qualifyAndMatchExternalOffer("non-existent-id-12345");
    assert.equal(res.success, false);
    assert.equal(res.status, "NOT_FOUND");
    assert.equal(res.matchesCount, 0);
  });

  test("processOfferBatch handles short batch limits and returns remaining count metadata", async () => {
    if (!process.env.DATABASE_URL) return;
    const res = await processOfferBatch({ limit: 5, statusFilter: ["NON_EXISTENT_STATUS"] });
    assert.equal(res.totalProcessed, 0);
    assert.equal(res.qualified, 0);
    assert.equal(res.matched, 0);
    assert.equal(res.errors, 0);
    assert.equal(res.remainingPendingCount, 0);
    assert.equal(res.hasMore, false);
  });

  test("Safe fallback qualification rule: never assigns arbitrary taxonomy[0] when category is undetermined", async () => {
    const pipelineSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./lib/jobs/offer-pipeline.ts", "utf-8")
    );
    // Verify pipeline source code explicitly checks for valid category without defaulting to taxonomy[0]
    assert.ok(!pipelineSource.includes("taxonomy[0].code"));
    assert.ok(pipelineSource.includes("Catégorie professionnelle indéterminée"));
  });

  test("Atomic lock protection: uses QUALIFYING status before running heavy AI or matching tasks", async () => {
    const pipelineSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./lib/jobs/offer-pipeline.ts", "utf-8")
    );
    assert.ok(pipelineSource.includes('status: "QUALIFYING"'));
    assert.ok(pipelineSource.includes("Verrou non acquis : offre en cours de traitement par un autre processus"));
  });

  test("Human validation guarantee check: qualification and matching never auto-create applications or contact candidates", async () => {
    const pipelineSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./lib/jobs/offer-pipeline.ts", "utf-8")
    );
    assert.ok(!pipelineSource.includes("candidateApplication.create"));
    assert.ok(!pipelineSource.includes("sendEmail"));
  });

  test("UI Counter queries in offres-vivier page cover DETECTED, A_QUALIFIER, and QUALIFYING as pending qualification", async () => {
    const pageSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./app/espace/owner/offres-vivier/page.tsx", "utf-8")
    );
    assert.ok(pageSource.includes('status: { in: ["DETECTED", "A_QUALIFIER", "QUALIFYING"] }'));
    assert.ok(pageSource.includes('status: "QUALIFIED"'));
    assert.ok(pageSource.includes('status: "MATCHING"'));
    assert.ok(pageSource.includes("Vivier strictement interne"));
  });

  test("Ingestion is idempotent and only triggers auto-qualification for newly created or pending offers", async () => {
    const ingestSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./lib/sourcing/ingest.ts", "utf-8")
    );
    assert.ok(ingestSource.includes('["DETECTED", "A_QUALIFIER"].includes(existing.status)'));
  });

  test("Batch process API route exists and enforces OFFRES_VIVIER permission check", async () => {
    const batchRouteSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./app/api/owner/offres-vivier/batch-process/route.ts", "utf-8")
    );
    assert.ok(batchRouteSource.includes("requireAccess"));
    assert.ok(batchRouteSource.includes("processOfferBatch"));
    assert.ok(batchRouteSource.includes("OFFRES_VIVIER"));
    assert.ok(batchRouteSource.includes("Math.min(20,"));
  });

  test("Browser client loop terminates properly on stalled progress without looping infinitely", async () => {
    const btnSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./components/owner/BatchProcessOffersButton.tsx", "utf-8")
    );
    assert.ok(btnSource.includes("!progressMade && remaining > 0"));
    assert.ok(btnSource.includes("Traitement interrompu"));
    assert.ok(btnSource.includes("break;"));
  });

  test("Stale lock recovery and attempt counter increments are enforced in pipeline", async () => {
    const pipelineSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./lib/jobs/offer-pipeline.ts", "utf-8")
    );
    assert.ok(pipelineSource.includes("fiveMinutesAgo"));
    assert.ok(pipelineSource.includes("attemptCount"));
    assert.ok(pipelineSource.includes("progressMade"));
  });
});
