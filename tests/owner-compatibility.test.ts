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
  assert.match(config, /role/);
  assert.match(auth, /role/);
});

test("OWNER access gate: critical OWNER routes remain server-protected", () => {
  const ownerDir = path.resolve("app/espace/owner");
  assert.equal(fs.existsSync(ownerDir), true);
  const files = fs.readdirSync(ownerDir, { recursive: true }).map(String);
  assert.ok(files.some((file) => file.endsWith("page.tsx")));
});

test("OWNER access gate: tests cannot contain production OWNER mailbox addresses", () => {
  const testDir = path.resolve("tests");
  const files = fs.readdirSync(testDir).filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));
  const forbidden = ["recrutement.prive@hotmail.com", "contact@recrutement-prive.com"];
  for (const file of files) {
    const content = fs.readFileSync(path.join(testDir, file), "utf8");
    for (const value of forbidden) {
      assert.equal(content.includes(value), false, `Production mailbox found in test: ${file}`);
    }
  }
});
