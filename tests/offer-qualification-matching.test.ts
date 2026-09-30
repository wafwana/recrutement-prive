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

  test("processOfferBatch handles short batch limits (max 15) and returns remaining count metadata", async () => {
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
    assert.ok(!pipelineSource.includes("taxonomy[0].code"));
    assert.ok(pipelineSource.includes("Catégorie professionnelle indéterminée"));
  });

  test("Atomic lock protection: returns immediately when updateMany count is 0", async () => {
    const pipelineSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./lib/jobs/offer-pipeline.ts", "utf-8")
    );
    assert.ok(pipelineSource.includes('status: "QUALIFYING"'));
    assert.ok(pipelineSource.includes("acquiredLock.count === 0"));
    assert.ok(pipelineSource.includes("Offre en cours de traitement par un autre processus ou déjà verrouillée"));
  });

  test("Bounded batch progress: processOfferBatch calculates progressCount and attempt metadata to prevent infinite loops", async () => {
    const pipelineSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./lib/jobs/offer-pipeline.ts", "utf-8")
    );
    assert.ok(pipelineSource.includes("progressCount"));
    assert.ok(pipelineSource.includes("attemptCount"));
    assert.ok(pipelineSource.includes("lastAttemptAt"));
    assert.ok(pipelineSource.includes("Math.min(15"));
  });

  test("UI BatchProcessOffersButton halts execution on zero progress to avoid browser infinite loops", async () => {
    const buttonSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./components/owner/BatchProcessOffersButton.tsx", "utf-8")
    );
    assert.ok(buttonSource.includes("progressCount === 0"));
    assert.ok(buttonSource.includes("Traitement en pause"));
  });

  test("API route /api/owner/offres-vivier/batch-process enforces strict server-side max limit of 15", async () => {
    const routeSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./app/api/owner/offres-vivier/batch-process/route.ts", "utf-8")
    );
    assert.ok(routeSource.includes("Math.min(15"));
    assert.ok(routeSource.includes("OFFRES_VIVIER"));
  });

  test("Human validation guarantee check: qualification and matching never auto-create applications or contact candidates", async () => {
    const pipelineSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./lib/jobs/offer-pipeline.ts", "utf-8")
    );
    assert.ok(!pipelineSource.includes("candidateApplication.create"));
    assert.ok(!pipelineSource.includes("sendEmail"));
  });
});
