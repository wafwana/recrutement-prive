import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SUPPORTED_LOCALES } from "../lib/i18n/config";
import { getTranslation, WORKSPACE_NAV_TRANSLATIONS } from "../lib/i18n/dictionaries";

const root = process.cwd();

test("all workspace navigation keys have non-empty translations in all seven supported locales", () => {
  const sourceFiles = [
    "components/workspace/RoleWorkspaceNavigation.tsx",
    "components/owner/OwnerWorkspaceNavigation.tsx",
    "components/navigation/ReturnToSiteLink.tsx",
  ];
  const source = sourceFiles.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  const usedKeys = [...new Set([...source.matchAll(/["'](ws_[a-z0-9_]+)["']/g)].map((match) => match[1]))];
  assert.ok(usedKeys.length >= 55, `expected a full workspace translation set; got ${usedKeys.length} keys`);
  assert.deepEqual([...SUPPORTED_LOCALES], ["fr", "en", "es", "de", "it", "ar", "nl"]);

  for (const locale of SUPPORTED_LOCALES) {
    for (const key of usedKeys) {
      const value = WORKSPACE_NAV_TRANSLATIONS[locale]?.[key];
      assert.ok(typeof value === "string", `${locale} has no string for ${key}`);
      assert.ok(value.trim().length > 0, `${locale} has an empty translation for ${key}`);
      assert.notEqual(value, key, `${locale} falls back to the raw key for ${key}`);
      assert.equal(getTranslation(locale, key), value, `${locale} does not resolve ${key} through getTranslation`);
    }
  }
});

test("workspace headings and navigation actions are genuinely localized", () => {
  const titleKeys = ["ws_candidate_title", "ws_enterprise_title", "ws_consultant_title", "ws_admin_title", "ws_owner_title", "ws_site_return"];
  for (const key of titleKeys) {
    const french = WORKSPACE_NAV_TRANSLATIONS.fr[key];
    assert.ok(french, `French baseline missing ${key}`);
    for (const locale of SUPPORTED_LOCALES.filter((value) => value !== "fr")) {
      const translated = WORKSPACE_NAV_TRANSLATIONS[locale][key];
      assert.ok(translated, `${locale} missing ${key}`);
      assert.notEqual(translated, french, `${locale} still shows the French label for ${key}`);
    }
  }
  assert.ok(/\p{Script=Arabic}/u.test(WORKSPACE_NAV_TRANSLATIONS.ar.ws_owner_title));
});
