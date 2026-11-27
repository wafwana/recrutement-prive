import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("Candidate directory is server-protected and lists only active candidate accounts", () => {
  const page = read("app/espace/owner/candidats/page.tsx");
  assert.match(page, /const session = await auth\(\)/);
  assert.match(page, /role !== "ADMIN" \|\| !\(await hasPermission\(userId, role, "CANDIDATES_VIEW"\)\)/);
  assert.match(page, /hasPermission\(userId, role, "CANDIDATES_MANAGE"\)/);
  assert.match(page, /hasPermission\(userId, role, "DOCUMENTS_VIEW"\)/);
  assert.match(page, /documents: canViewDocuments/);
  assert.match(page, /canManageCandidates && canDepositDocuments/);
  assert.match(page, /where: \{ role: "CANDIDAT", status: "ACTIVE" \}/);
  assert.match(page, /primaryCategory: \{ select: \{ name: true \} \}/);
  assert.match(page, /select: \{ id: true, name: true, type: true, createdAt: true \}/);
  assert.doesNotMatch(page, /cvUrl|storageUrl|documentUrl/);
  assert.match(page, /\/api\/candidats\/documents\/\$\{doc\.id\}/);
});

test("Candidate document uploads require view, manage and deposit permissions and audit the actor role", () => {
  const route = read("app/api/owner/candidates/documents/route.ts");
  for (const permission of ["CANDIDATES_VIEW", "CANDIDATES_MANAGE", "DOCUMENTS_DEPOSIT"]) {
    assert.match(route, new RegExp(`hasPermission\\(actorUserId, actorRole, "${permission}"\\)`));
  }
  assert.match(route, /actorRole === "OWNER" \? "OWNER_CANDIDATE_DOCUMENT_UPLOAD" : "ADMIN_CANDIDATE_DOCUMENT_UPLOAD"/);
  assert.match(route, /provenance: actorRole === "OWNER" \? "OWNER_MANUAL_UPLOAD" : "ADMIN_MANUAL_UPLOAD"/);
});

test("Owner cockpit count matches active CANDIDAT accounts and links the dedicated directory", () => {
  const page = read("app/espace/owner/page.tsx");
  assert.match(page, /prisma\.user\.count\(\{ where: \{ role: "CANDIDAT", status: "ACTIVE" \} \}\)/);
  assert.match(page, /\["Candidats", candidates, "\/espace\/owner\/candidats", "Voir les candidats"\]/);
});


test("ADMIN candidate permission scopes the dashboard query to candidate accounts without changing OWNER", () => {
  const page = read("app/espace/admin/page.tsx");
  assert.match(page, /canViewCandidates \|\| isOwner\s*\?\s*prisma\.user\.findMany\(\{\s*where: isOwner \? undefined : \{ role: "CANDIDAT" \}/);
  assert.match(page, /isOwner \? "Utilisateurs" : "Candidats"/);
});
