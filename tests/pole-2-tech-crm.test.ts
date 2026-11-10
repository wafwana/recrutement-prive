import assert from "node:assert/strict";
import fs from "node:fs";
import testCase from "node:test";

testCase("Pôle 2 CRM schema remains additive and isolated", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  for (const model of ["TechProspectEvent", "TechProposal", "TechProjectEvent", "TechProjectMilestone", "TechProjectTask"]) {
    assert.ok(schema.includes(`model ${model} {`));
  }
  assert.ok(schema.includes("leadSource          String?"));
  assert.ok(schema.includes("fileData             Bytes?"));
});
testCase("Pôle 2 CRM API centralizes staff access and OWNER-only decisions", () => {
  const access = fs.readFileSync("lib/tech/access.ts", "utf8");
  const decision = fs.readFileSync("app/api/tech/proposals/[id]/decision/route.ts", "utf8");
  const pipeline = fs.readFileSync("app/api/tech/pipeline/route.ts", "utf8");
  assert.ok(access.includes('role === "OWNER"'));
  assert.ok(access.includes("TECH_SOLUTIONS_MANAGE"));
  assert.ok(decision.includes("if(!actor.isOwner)"));
  assert.ok(pipeline.includes("if(!actor.isOwner)"));
});
testCase("Pôle 2 CRM routes audit business mutations", () => {
  for (const path of [
    "app/api/tech/prospects/route.ts",
    "app/api/tech/prospects/[id]/route.ts",
    "app/api/tech/proposals/route.ts",
    "app/api/tech/projects/route.ts",
    "app/api/tech/requirements/route.ts",
  ]) assert.ok(fs.readFileSync(path, "utf8").includes("auditLog.create"));
});

testCase("Pôle 2 company bridge imports only safe Pôle 1 identity data under OWNER control", () => {
  const route = fs.readFileSync("app/api/tech/prospects/import-pole1/route.ts", "utf8");
  assert.ok(route.includes("if (!actor.isOwner)"));
  assert.ok(route.includes('status: "ACTIVE"'));
  assert.ok(route.includes("siren: true"));
  assert.ok(route.includes("siret: true"));
  assert.ok(route.includes("sourceCompanyId: company.id"));
  assert.ok(route.includes('contactPermission: "NOT_GRANTED"'));
  assert.ok(route.includes("Aucun contact externe"));
  assert.ok(!route.includes("application.findMany"));
  assert.ok(!route.includes("job.findMany"));
});
