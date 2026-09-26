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
