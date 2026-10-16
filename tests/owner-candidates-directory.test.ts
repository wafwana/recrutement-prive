import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("Owner candidate directory is server-protected and lists only active candidate accounts", () => {
  const page = read("app/espace/owner/candidats/page.tsx");
  assert.match(page, /const session = await auth\(\)/);
  assert.match(page, /session\.user\.role !== "OWNER"/);
  assert.match(page, /where: \{ role: "CANDIDAT", status: "ACTIVE" \}/);
  assert.match(page, /primaryCategory: \{ select: \{ name: true \} \}/);
  assert.match(page, /documents: \{/);
  assert.match(page, /select: \{ id: true, name: true, type: true, createdAt: true \}/);
  assert.doesNotMatch(page, /cvUrl|storageUrl|documentUrl/);
  assert.match(page, /\/api\/candidats\/documents\/\$\{doc\.id\}/);
});

test("Owner cockpit count matches active CANDIDAT accounts and links the dedicated directory", () => {
  const page = read("app/espace/owner/page.tsx");
  assert.match(page, /prisma\.user\.count\(\{ where: \{ role: "CANDIDAT", status: "ACTIVE" \} \}\)/);
  assert.match(page, /\["Candidats", candidates, "\/espace\/owner\/candidats", "Voir les candidats"\]/);
});
