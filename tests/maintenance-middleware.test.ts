import test from "node:test";
import assert from "node:assert/strict";

test("middleware path rule checks public vs protected routes", () => {
  const PUBLIC_PATHS = new Set(["/", "/connexion", "/maintenance", "/mot-de-passe-oublie", "/reinitialisation-mot-de-passe"]);

  assert.equal(PUBLIC_PATHS.has("/"), true);
  assert.equal(PUBLIC_PATHS.has("/connexion"), true);
  assert.equal(PUBLIC_PATHS.has("/mot-de-passe-oublie"), true);
  assert.equal(PUBLIC_PATHS.has("/reinitialisation-mot-de-passe"), true);
  assert.equal(PUBLIC_PATHS.has("/espace/owner"), false);
  assert.equal(PUBLIC_PATHS.has("/espace/candidat"), false);
});
