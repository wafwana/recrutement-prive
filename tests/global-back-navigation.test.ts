import test from "node:test";
import assert from "node:assert/strict";
import { shouldShowGlobalBackButton } from "../lib/navigation/back-button-policy";

test("global back control stays hidden on homepage, maintenance, owner setup and registration", () => {
  for (const pathname of ["/", "/maintenance", "/owner/initialisation", "/inscription", "/inscription/candidat"]) {
    assert.equal(shouldShowGlobalBackButton(pathname, 3, true, true), false, pathname);
  }
});

test("direct internal referrers can show the back control when browser history exists", () => {
  assert.equal(shouldShowGlobalBackButton("/espace/owner", 2, true, false), true);
});

test("client-side navigation within the app enables the back control", () => {
  assert.equal(shouldShowGlobalBackButton("/espace/owner/metiers", 2, false, true), true);
});

test("the control stays hidden if there is no back entry or no safe internal navigation", () => {
  assert.equal(shouldShowGlobalBackButton("/espace/owner", 1, true, false), false);
  assert.equal(shouldShowGlobalBackButton("/espace/owner", 2, false, false), false);
});
