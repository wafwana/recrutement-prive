import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Pole 2 CRM API route definitions and security contracts", () => {
  const prospectsRoute = "app/api/tech/prospects/route.ts";
  const prospectDetailRoute = "app/api/tech/prospects/[id]/route.ts";
  const prospectsPage = "app/espace/tech/prospects/page.tsx";

  assert.equal(fs.existsSync(prospectsRoute), true);
  assert.equal(fs.existsSync(prospectDetailRoute), true);
  assert.equal(fs.existsSync(prospectsPage), true);

  const routeContent = fs.readFileSync(prospectsRoute, "utf8");
  // Protection session et permission TECH_SOLUTIONS_MANAGE
  assert.match(routeContent, /hasPermission\(session\.user\.id,\s*role,\s*"TECH_SOLUTIONS_MANAGE"\)/);
  assert.match(routeContent, /status:\s*401/);
  assert.match(routeContent, /status:\s*403/);
  // Validation Zod
  assert.match(routeContent, /createProspectSchema/);
  assert.match(routeContent, /companyName:\s*z\.string\(\)\.min\(1/);

  const detailContent = fs.readFileSync(prospectDetailRoute, "utf8");
  // Sécurisation de la suppression réservée à l'OWNER
  assert.match(detailContent, /session\.user\.role\s*!==\s*"OWNER"/);
  assert.match(detailContent, /Action réservée à l'OWNER/);
  // Protection contre suppression si dépendances liées
  assert.match(detailContent, /prospect\._count\.requirements\s*>\s*0\s*\|\|\s*prospect\._count\.projects\s*>\s*0/);
});

test("Pole 2 CRM Prospects pipeline and priorities integrity", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  assert.match(schema, /model TechProspect/);
  assert.match(schema, /companyName\s+String/);
  assert.match(schema, /siren\s+String\?/);
  assert.match(schema, /siret\s+String\?/);
  assert.match(schema, /status\s+String\s+@default\("NOUVEAU"\)/);
  assert.match(schema, /priority\s+String\s+@default\("MOYENNE"\)/);
  assert.match(schema, /requirements\s+TechRequirementDoc\[\]/);
  assert.match(schema, /projects\s+TechProject\[\]/);
});
