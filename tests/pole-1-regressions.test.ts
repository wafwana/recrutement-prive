import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("CV intake search covers file names, candidate identity and candidate email", () => {
  const route = read("app/api/owner/cv-intake/route.ts");
  for (const field of ["name", "originalName", "candidateName", "candidateEmail", "folderPath"]) {
    assert.match(route, new RegExp("\\{ " + field + ": \\{ contains: q, mode: \"insensitive\" \\} \\}"));
  }
  assert.match(route, /originalSha256/);
  assert.match(route, /fileData/);
});

test("CV intake remains permission-gated and keeps original documents", () => {
  const route = read("app/api/owner/cv-intake/route.ts");
  assert.match(route, /hasPermission\\(userId, session\\?\\.user\\?\\.role \\|\\| undefined, \"CV_INTAKE\"\\)/);
  assert.match(route, /originalSha256/);
  assert.doesNotMatch(route, /prisma\\.cvIntake\\.delete/);
});

test("offer pool detail is internal, preserves original text and displays stored French translation", () => {
  const page = read("app/espace/owner/offres-vivier/[id]/page.tsx");
  assert.match(page, /hasPermission\\(userId, role, \"OFFRES_VIVIER\"\\)/);
  assert.match(page, /translationRoot\\.fr/);
  assert.match(page, /titleFr/);
  assert.match(page, /descriptionFr/);
  assert.match(page, /summaryFr/);
  assert.match(page, /Description intégrale de l’offre · originale/);
  assert.match(page, /Compétences identifiées/);
});

test("offer pool list links to the complete internal detail page", () => {
  const page = read("app/espace/owner/offres-vivier/page.tsx");
  assert.match(page, /offres-vivier\\/\$\\{offer\\.id\\}/);
  assert.match(page, /Consulter le détail complet/);
});

test("focused matching is bounded and reports omitted records", () => {
  const route = read("app/api/owner/cv-matching/route.ts");
  assert.match(route, /take: 500/);
  assert.match(route, /totalActiveCandidates > candidates\\.length/);
  assert.match(route, /totalOpenJobs > jobs\\.length/);
  assert.match(route, /truncated: totalActiveCandidates > candidates\\.length/);
  assert.match(route, /truncated: totalOpenJobs > jobs\\.length/);
});