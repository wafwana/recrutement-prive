import assert from "node:assert/strict";
import { test } from "node:test";
import { POST as analyzeCvPost } from "../app/api/owner/cv-intake/[id]/analyze/route";
import { POST as batchAnalyzePost } from "../app/api/owner/cv-intake/batch-analyze/route";
import { runWithTestSession } from "../auth";

test("CV intake analyze endpoints permission checks", async () => {
  // Test unauthenticated calls return 403
  await runWithTestSession({}, async () => {
    const req = new Request("http://localhost/api/owner/cv-intake/test-id/analyze", { method: "POST" });
    const params = Promise.resolve({ id: "test-id" });
    const res = await analyzeCvPost(req, { params });
    assert.equal(res.status, 403);
  });

  await runWithTestSession({}, async () => {
    const req = new Request("http://localhost/api/owner/cv-intake/batch-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 5 }),
    });
    const res = await batchAnalyzePost(req);
    assert.equal(res.status, 403);
  });

  // Database integration test
  if (!process.env.DATABASE_URL) {
    console.log("Skipping DB integration check for OWNER access: DATABASE_URL not set.");
    return;
  }

  // Test authorized OWNER role access
  await runWithTestSession({ user: { id: "owner-id", role: "OWNER" } }, async () => {
    const req = new Request("http://localhost/api/owner/cv-intake/nonexistent-id/analyze", { method: "POST" });
    const params = Promise.resolve({ id: "nonexistent-id" });
    const res = await analyzeCvPost(req, { params });
    // Since nonexistent-id is not in DB, expects 404
    assert.equal(res.status, 404);
  });
});
