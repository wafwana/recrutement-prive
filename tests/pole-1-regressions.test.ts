import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("CV library applies the active search to both candidate documents and intake records", () => {
  const route = read("app/api/documents/cv-library/route.ts");
  assert.ok(route.includes("const intakeDocs = await prisma.cvIntake.findMany({"));
  assert.ok(route.includes("where: q"));
  for (const field of ["name", "originalName", "candidateName", "candidateEmail", "folderPath"]) {
    assert.ok(route.includes(field + ": { contains: q, mode: \"insensitive\" }"), "missing CV library filter: " + field);
  }
});

test("CV intake search covers file names, candidate identity and candidate email", () => {
  const route = read("app/api/owner/cv-intake/route.ts");
  for (const field of ["name", "originalName", "candidateName", "candidateEmail", "folderPath"]) {
    assert.ok(route.includes(field + ": { contains: q, mode: \"insensitive\" }"), "missing CV intake filter: " + field);
  }
  assert.ok(route.includes("originalSha256"));
  assert.ok(route.includes("fileData"));
});

test("CV intake remains permission-gated and keeps original documents", () => {
  const route = read("app/api/owner/cv-intake/route.ts");
  assert.ok(route.includes("hasPermission(userId, session?.user?.role || undefined, \"CV_INTAKE\")"));
  assert.ok(route.includes("originalSha256"));
  assert.ok(!route.includes("prisma.cvIntake.delete"));
});

test("offer pool detail is internal, preserves original text and displays stored French translation", () => {
  const page = read("app/espace/owner/offres-vivier/[id]/page.tsx");
  assert.ok(page.includes("hasPermission(userId, role, \"OFFRES_VIVIER\")"));
  for (const field of ["translationRoot.fr", "titleFr", "descriptionFr", "summaryFr", "Description intégrale de l’offre · originale", "Compétences identifiées"]) {
    assert.ok(page.includes(field), "missing offer detail field: " + field);
  }
});

test("offer pool list links to the complete internal detail page", () => {
  const page = read("app/espace/owner/offres-vivier/page.tsx");
  assert.ok(page.includes("/espace/owner/offres-vivier/"));
  assert.ok(page.includes("offer.id"));
  assert.ok(page.includes("Consulter le détail complet"));
});

test("focused matching is bounded and reports omitted records", () => {
  const route = read("app/api/owner/cv-matching/route.ts");
  assert.ok(route.includes("take: 500"));
  assert.ok(route.includes("totalActiveCandidates > candidates.length"));
  assert.ok(route.includes("totalOpenJobs > jobs.length"));
  assert.ok(route.includes("truncated: totalActiveCandidates > candidates.length"));
  assert.ok(route.includes("truncated: totalOpenJobs > jobs.length"));
  const recalculate = route.slice(route.indexOf("if (parsed.data.action === \"recalculate\")"));
  assert.ok(recalculate.includes("matchCandidateToJob("));
  assert.ok(recalculate.includes("const evaluationLimit = candidateId || jobId ? 500 : 150;"));
  assert.ok(recalculate.includes("take: evaluationLimit"));
  assert.ok(recalculate.includes("evaluationLimit,"));
  assert.ok(recalculate.includes("evaluatedPairs"));
  assert.ok(recalculate.includes("truncated: totalCandidates > candidates.length || totalJobs > jobs.length"));
  assert.ok(route.includes("canViewCandidateDocuments"));
  assert.ok(route.includes("documents: { where: { docType: \"CV\""));
  const page = read("app/espace/owner/cv-matching/page.tsx");
  assert.ok(page.includes("/api/candidats/documents/"));
});