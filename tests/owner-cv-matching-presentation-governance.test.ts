import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("matching dashboard presentation controls are Owner-only", () => {
  const route = fs.readFileSync("app/api/owner/cv-matching/route.ts", "utf8");
  assert.ok(route.includes('const canPresent = access.role === "OWNER";'));
  assert.ok(route.includes('if (parsed.data.action === "propose_anonymized") {\n    if (access.role !== "OWNER")'));
  assert.ok(route.includes('if (parsed.data.action === "propose_full") {\n    if (access.role !== "OWNER")'));
  assert.ok(route.includes('parsed.data.action === "connect_matchmaking" || parsed.data.action === "present") {\n    if (access.role !== "OWNER")'));
  assert.ok(!route.includes('access.role === "ADMIN" && await hasPermission(access.userId, access.role, "PRESENTATIONS_MANAGE")'));
  const page = fs.readFileSync("app/espace/owner/cv-matching/page.tsx", "utf8");
  assert.ok(page.includes("canPresent"));
});

test("ADMIN cannot create anonymized, full or connected candidate proposals through the matching API", () => {
  const route = fs.readFileSync("app/api/owner/cv-matching/route.ts", "utf8");
  const ownerOnlyGuards = route.match(/if \(access\.role !== "OWNER"\)/g) || [];
  assert.equal(ownerOnlyGuards.length, 3);
  assert.ok(route.includes("réservées à l’OWNER"));
});
