import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Pole 2 commercial proposals and projects API security contracts", () => {
  const proposalRoute = "app/api/tech/proposals/route.ts";
  const projectRoute = "app/api/tech/projects/route.ts";
  const projectsPage = "app/espace/tech/projects/page.tsx";

  assert.equal(fs.existsSync(proposalRoute), true);
  assert.equal(fs.existsSync(projectRoute), true);
  assert.equal(fs.existsSync(projectsPage), true);

  const proposalContent = fs.readFileSync(proposalRoute, "utf8");
  assert.match(proposalContent, /hasPermission\(session\.user\.id,\s*role,\s*"TECH_SOLUTIONS_MANAGE"\)/);
  assert.match(proposalContent, /createProposalSchema/);
  assert.match(proposalContent, /status:\s*"PROPOSITION"/);

  const projectContent = fs.readFileSync(projectRoute, "utf8");
  assert.match(projectContent, /hasPermission\(session\.user\.id,\s*role,\s*"TECH_SOLUTIONS_MANAGE"\)/);
  assert.match(projectContent, /createProjectSchema/);
  assert.match(projectContent, /CADRAGE/);
  assert.match(projectContent, /DEVELOPPEMENT/);
  assert.match(projectContent, /RECETTE/);
  assert.match(projectContent, /LIVRE/);
  assert.match(projectContent, /MAINTENANCE/);
});

test("Pole 2 project lifecycle and financial schema support", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  assert.match(schema, /model TechProject/);
  assert.match(schema, /setupPrice\s+Float\?/);
  assert.match(schema, /monthlySubscriptionPrice\s+Float\?/);
  assert.match(schema, /currency\s+String\s+@default\("EUR"\)/);
  assert.match(schema, /repositoryUrl\s+String\?/);
  assert.match(schema, /status\s+String\s+@default\("CADRAGE"\)/);
});
