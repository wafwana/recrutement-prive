import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { PERMISSIONS, hasPermission } from "../lib/auth/permissions";

test("Pole 2 Prisma schema isolation and completeness", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");

  // Vérifier la présence des modèles étanches Pôle 2
  assert.match(schema, /model TechProspect \{/);
  assert.match(schema, /model TechRequirementDoc \{/);
  assert.match(schema, /model TechProject \{/);

  // Vérifier l'étanchéité : aucun lien obligatoire avec les tables Pôle 1
  assert.doesNotMatch(schema, /candidateProfileId.*TechProspect/);
  assert.doesNotMatch(schema, /jobId.*TechProject/);

  // Vérifier la migration SQL
  const migrationPath = "prisma/migrations/20261103000000_pole_2_tech_foundations/migration.sql";
  assert.equal(fs.existsSync(migrationPath), true);
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "TechProspect"/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "TechRequirementDoc"/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "TechProject"/);
});

test("Pole 2 atomic permission TECH_SOLUTIONS_MANAGE configuration and RBAC", async () => {
  // 1. Déclaration dans la liste canonique
  assert.equal((PERMISSIONS as readonly string[]).includes("TECH_SOLUTIONS_MANAGE"), true);

  // 2. OWNER a tous les droits de manière inconditionnelle
  const isOwnerAllowed = await hasPermission("usr_owner_001", "OWNER", "TECH_SOLUTIONS_MANAGE");
  assert.equal(isOwnerAllowed, true);

  // 3. Sans configuration en base, un non-OWNER (ADMIN ou CONSULTANT) est refusé
  const isAdminWithoutConfig = await hasPermission("usr_admin_unconfigured", "ADMIN", "TECH_SOLUTIONS_MANAGE");
  assert.equal(isAdminWithoutConfig, false);

  const isConsultantWithoutConfig = await hasPermission("usr_consultant_unconfigured", "CONSULTANT", "TECH_SOLUTIONS_MANAGE");
  assert.equal(isConsultantWithoutConfig, false);
});

test("Pole 2 Cockpit and Workspace pages server protection contracts", () => {
  const ownerPageContent = fs.readFileSync("app/espace/owner/solutions-tech/page.tsx", "utf8");
  assert.match(ownerPageContent, /TECH_SOLUTIONS_MANAGE/);
  assert.match(ownerPageContent, /prisma\.techProspect\.count/);
  assert.match(ownerPageContent, /prisma\.techRequirementDoc\.count/);
  assert.match(ownerPageContent, /prisma\.techProject\.count/);

  const techWorkspaceContent = fs.readFileSync("app/espace/tech/page.tsx", "utf8");
  assert.match(techWorkspaceContent, /hasPermission\(userId, role, "TECH_SOLUTIONS_MANAGE"\)/);
  assert.match(techWorkspaceContent, /redirect\("\/espace"\)/);

  // Vérifier la présence du lien Pôle 2 dans le cockpit principal OWNER
  const mainOwnerPage = fs.readFileSync("app/espace/owner/page.tsx", "utf8");
  assert.match(mainOwnerPage, /\/espace\/owner\/solutions-tech/);
});
