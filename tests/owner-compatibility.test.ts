import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(file), "utf8");

test("OWNER access gate: OWNER role remains explicit and server-side", () => {
  const ownerPage = read("app/espace/owner/page.tsx");
  assert.match(ownerPage, /role !== ["']OWNER["']/);
  assert.match(ownerPage, /session\?\.user\?\.id/);
  assert.match(ownerPage, /redirect\(["']\/connexion["']\)/);
});

test("OWNER access gate: maintenance mode never replaces OWNER with a weaker role", () => {
  const middleware = read("middleware.ts");
  assert.match(middleware, /token\?\.user\?\.role === ["']OWNER["']/);
  assert.match(middleware, /if \(MAINTENANCE_MODE && !isOwner\)/);
});

test("OWNER access gate: authentication configuration propagates the custom role", () => {
  const config = read("auth.config.ts");
  const auth = read("auth.ts");
  assert.match(config, /authorized\(\{ auth, request \}\)/);
  assert.match(auth, /role/);
  assert.match(auth, /callbacks/);
});

test("OWNER access gate: critical OWNER routes remain server-protected", () => {
  const ownerDir = path.resolve("app/espace/owner");
  assert.equal(fs.existsSync(ownerDir), true);
  const files = fs.readdirSync(ownerDir, { recursive: true }).map(String);
  assert.ok(files.some((file) => file.endsWith("page.tsx")));
});

test("governance: ADMIN management route refuses OWNER targets and only creates ADMIN/CONSULTANT", () => {
  const source = read("app/api/owner/admins/route.ts");
  assert.match(source, /z\.enum\(\[["']ADMIN["'],\s*["']CONSULTANT["']\]\)/);
  assert.match(source, /targetUser\.role === ["']OWNER["']/);
  assert.match(source, /Owner suprême ne peut pas être modifié/);
});

test("governance: granular permissions are OWNER-controlled and ADMINs do not inherit them", () => {
  const permissions = read("lib/auth/permissions.ts");
  assert.match(permissions, /if \(role === ["']OWNER["']\) return true/);
  assert.match(permissions, /if \(permissions === null\) return false/);
  const route = read("app/api/owner/permissions/route.ts");
  assert.match(route, /session\.user\.role === ["']OWNER["']/);
  assert.match(route, /\["ADMIN", "CONSULTANT"\]/);
});

test("OWNER dashboard compatibility route redirects to the canonical cockpit", () => {
  const compatibilityPage = read("app/owner/page.tsx");
  assert.match(compatibilityPage, /redirect\(["']\/espace\/owner["']\)/);
  assert.doesNotMatch(compatibilityPage, /permissions/i);
});

test("OWNER permissions route remains separate from the dashboard compatibility redirect", () => {
  const permissionsPage = read("app/owner/permissions/page.tsx");
  assert.match(permissionsPage, /Permissions ADMIN \/ CONSULTANT/);
  assert.doesNotMatch(permissionsPage, /redirect\(["']\/espace\/owner["']\)/);
});

test("OWNER access gate: unauthorized access still redirects to sign-in", () => {
  const ownerPage = read("app/espace/owner/page.tsx");
  assert.match(ownerPage, /if \(!session\?\.user\?\.id \|\| role !== ["']OWNER["']\) redirect\(["']\/connexion["']\)/);
});
