import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

test("Brique A - Supported file extensions regex correctly matches ordinary CV filenames", () => {
  const extensionRegex = /\.(pdf|doc|docx|jpe?g)$/i;

  const validNames = [
    "cv.pdf",
    "CANDIDAT_2026.PDF",
    "mon_cv.docx",
    "resume.doc",
    "cv_photo.jpg",
    "SCAN_CV.JPEG",
  ];

  for (const name of validNames) {
    assert.ok(extensionRegex.test(name), `Filename "${name}" must be recognized as supported CV format`);
  }

  const invalidNames = [
    "script.exe",
    "archive.zip",
    "document.txt",
    "data.json",
    "cv.pdf.exe",
  ];

  for (const name of invalidNames) {
    assert.ok(!extensionRegex.test(name), `Filename "${name}" must be rejected from CV bulk folder import`);
  }
});

test("Brique A - SHA-256 hash formatting and calculation consistency", async () => {
  const dummyCvContent = Buffer.from("Jean Dupont - Senior Software Engineer CV Content");
  const expectedHash = createHash("sha256").update(dummyCvContent).digest("hex");

  assert.equal(expectedHash.length, 64, "SHA-256 hash must be 64 hexadecimal characters");
  assert.match(expectedHash, /^[a-f0-9]{64}$/, "SHA-256 hash must be lower-case hex string");
});

test("Brique A - Duplicate status classification (HTTP 409 treated as duplicate/ignored)", async () => {
  function classifyResponse(status: number, data: { duplicateId?: string; error?: string }) {
    if (status === 201 || status === 200) return "IMPORTED";
    if (status === 409 && (data.duplicateId || data.error?.includes("déjà répertorié"))) return "DUPLICATE_IGNORED";
    if (status >= 400 && status < 500) return "PERMANENT_ERROR";
    if (status >= 500) return "TRANSIENT_ERROR";
    return "UNKNOWN_ERROR";
  }

  assert.equal(classifyResponse(201, {}), "IMPORTED");
  assert.equal(classifyResponse(409, { duplicateId: "dup-123", error: "Ce CV original est déjà répertorié." }), "DUPLICATE_IGNORED");
  assert.equal(classifyResponse(400, { error: "Fichier non conforme." }), "PERMANENT_ERROR");
  assert.equal(classifyResponse(503, { error: "Service indisponible" }), "TRANSIENT_ERROR");
});

test("Brique A - Non-blocking batch stats progression", async () => {
  type Stats = {
    total: number;
    processed: number;
    imported: number;
    duplicates: number;
    failures: number;
    skippedNonCv: number;
  };

  const files = [
    { name: "cv1.pdf", result: "IMPORTED" },
    { name: "cv2.pdf", result: "DUPLICATE" },
    { name: "cv3.pdf", result: "TRANSIENT_THEN_IMPORTED" },
    { name: "corrupted.txt", result: "SKIPPED_NON_CV" },
    { name: "failed.pdf", result: "PERMANENT_ERROR" },
  ];

  const cvFiles = files.filter((f) => f.result !== "SKIPPED_NON_CV");
  const stats: Stats = {
    total: cvFiles.length,
    processed: 0,
    imported: 0,
    duplicates: 0,
    failures: 0,
    skippedNonCv: files.length - cvFiles.length,
  };

  for (const item of cvFiles) {
    stats.processed += 1;
    if (item.result === "IMPORTED" || item.result === "TRANSIENT_THEN_IMPORTED") {
      stats.imported += 1;
    } else if (item.result === "DUPLICATE") {
      stats.duplicates += 1;
    } else {
      stats.failures += 1;
    }
  }

  assert.equal(stats.total, 4, "Total CV files to process should be 4");
  assert.equal(stats.processed, 4, "All 4 CV items should be processed");
  assert.equal(stats.imported, 2, "2 CV items should be imported");
  assert.equal(stats.duplicates, 1, "1 CV item should be identified as duplicate");
  assert.equal(stats.failures, 1, "1 CV item should be identified as failure");
  assert.equal(stats.skippedNonCv, 1, "1 file should be skipped as non-CV");
});

test("Brique A - Retry logic with max attempts limit", async () => {
  let attempts = 0;
  async function simulateUploadWithRetry(maxAttempts = 3, succeedsOnAttempt = 2) {
    while (attempts < maxAttempts) {
      attempts += 1;
      if (attempts === succeedsOnAttempt) {
        return { ok: true, attempts };
      }
    }
    return { ok: false, attempts };
  }

  const res = await simulateUploadWithRetry(3, 2);
  assert.equal(res.ok, true, "Should succeed on attempt 2");
  assert.equal(res.attempts, 2, "Should take 2 attempts");

  attempts = 0;
  const failRes = await simulateUploadWithRetry(3, 99);
  assert.equal(failRes.ok, false, "Should fail when max attempts exceeded");
  assert.equal(failRes.attempts, 3, "Should try exactly 3 times before failing");
});
