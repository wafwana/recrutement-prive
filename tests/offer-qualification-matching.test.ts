import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { qualifyAndMatchExternalOffer, processOfferBatch } from "../lib/jobs/offer-pipeline";

describe("Chain Qualification & Matching Tests", () => {
  test("qualifyAndMatchExternalOffer handles missing offer gracefully", async () => {
    if (!process.env.DATABASE_URL) return;
    const res = await qualifyAndMatchExternalOffer("non-existent-id-12345");
    assert.equal(res.success, false);
    assert.equal(res.status, "NOT_FOUND");
    assert.equal(res.matchesCount, 0);
  });

  test("processOfferBatch handles empty batch and returns pagination metadata without error", async () => {
    if (!process.env.DATABASE_URL) return;
    const res = await processOfferBatch({ limit: 10, statusFilter: ["NON_EXISTENT_STATUS"] });
    assert.equal(res.totalProcessed, 0);
    assert.equal(res.qualified, 0);
    assert.equal(res.matched, 0);
    assert.equal(res.errors, 0);
    assert.equal(res.remainingPending, 0);
    assert.equal(res.hasMore, false);
  });

  test("Client batch button uses iterative chunking and communicates live progress", async () => {
    const buttonSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./components/owner/BatchProcessOffersButton.tsx", "utf-8")
    );
    assert.ok(buttonSource.includes("while (hasMore)"));
    assert.ok(buttonSource.includes("limit: 20"));
    assert.ok(buttonSource.includes("cumulativeProcessed"));
    assert.ok(buttonSource.includes("cumulativeQualified"));
  });

  test("Batch process API route caps maximum batch size to 25 to prevent Vercel HTTP timeouts", async () => {
    const batchRouteSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./app/api/owner/offres-vivier/batch-process/route.ts", "utf-8")
    );
    assert.ok(batchRouteSource.includes("Math.min(25,"));
  });

  test("Human validation guarantee check: qualification and matching never auto-create applications or contact candidates", async () => {
    const pipelineSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./lib/jobs/offer-pipeline.ts", "utf-8")
    );
    assert.ok(!pipelineSource.includes("candidateApplication.create"));
    assert.ok(!pipelineSource.includes("sendEmail"));
  });

  test("UI Counter queries in offres-vivier page cover both DETECTED and A_QUALIFIER as pending qualification", async () => {
    const pageSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./app/espace/owner/offres-vivier/page.tsx", "utf-8")
    );
    assert.ok(pageSource.includes('status: { in: ["DETECTED", "A_QUALIFIER"] }'));
    assert.ok(pageSource.includes('status: "QUALIFIED"'));
    assert.ok(pageSource.includes('status: "MATCHING"'));
  });

  test("Ingestion and POST endpoints call qualifyAndMatchExternalOffer automatically", async () => {
    const ingestSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./lib/sourcing/ingest.ts", "utf-8")
    );
    const postRouteSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./app/api/owner/offres-vivier/route.ts", "utf-8")
    );
    assert.ok(ingestSource.includes("qualifyAndMatchExternalOffer"));
    assert.ok(postRouteSource.includes("qualifyAndMatchExternalOffer"));
  });

  test("Batch process API route exists and enforces OFFRES_VIVIER permission check", async () => {
    const batchRouteSource = await import("node:fs").then((fs) =>
      fs.readFileSync("./app/api/owner/offres-vivier/batch-process/route.ts", "utf-8")
    );
    assert.ok(batchRouteSource.includes("requireAccess"));
    assert.ok(batchRouteSource.includes("processOfferBatch"));
    assert.ok(batchRouteSource.includes("OFFRES_VIVIER"));
  });
});
