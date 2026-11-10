import assert from "node:assert/strict";
import fs from "node:fs";
import testCase from "node:test";

testCase("Pôle 2 CRM schema remains additive and isolated", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  for (const model of ["TechProspectEvent","TechProposal","TechProjectEvent","TechProjectMilestone","TechProjectTask"]) {
    assert.match(schema, new RegExp(`model ${model} \\\{`));
  }
  assert.match(schema, /model TechProspect \\{[\\s\\S]*?leadSource\\s+String\\?/);
  assert.match(schema, /model TechRequirementDoc \\{[\\s\\S]*?fileData\\s+Bytes\\?/);
});
testCase("Pôle 2 CRM API centralizes staff access and OWNER-only decisions", () => {
  const access = fs.readFileSync("lib/tech/access.ts", "utf8");
  const decision = fs.readFileSync("app/api/tech/proposals/[id]/decision/route.ts", "utf8");
  const pipeline = fs.readFileSync("app/api/tech/pipeline/route.ts", "utf8");
  assert.match(access, /role === "OWNER"/);
  assert.match(access, /TECH_SOLUTIONS_MANAGE/);
  assert.match(decision, /if\\(!actor\\.isOwner\\)/);
  assert.match(pipeline, /if\\(!actor\\.isOwner\\)/);
});
testCase("Pôle 2 CRM routes audit business mutations", () => {
  for (const path of [
    "app/api/tech/prospects/route.ts",
    "app/api/tech/prospects/[id]/route.ts",
    "app/api/tech/proposals/route.ts",
    "app/api/tech/projects/route.ts",
    "app/api/tech/requirements/route.ts",
  ]) assert.match(fs.readFileSync(path, "utf8"), /auditLog\\.create/);
});
