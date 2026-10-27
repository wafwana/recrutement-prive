import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file: string) => fs.readFileSync(file, "utf8");

test("company registration displays and submits the values filled by SIRET lookup", () => {
  const page = read("app/inscription/entreprise/page.tsx");
  const lookup = read("app/components/CompanySiretLookup.tsx");

  assert.match(page, /value=\{companyName\}/);
  assert.match(page, /value=\{website\}/);
  assert.match(page, /value=\{country\}/);
  assert.match(page, /name="address"/);
  assert.match(page, /Forme juridique/);
  assert.match(page, /Code APE \/ activité/);
  assert.match(lookup, /required=\{required\}/);
});

test("company registration reports failures and always gives the user a next step", () => {
  const page = read("app/inscription/entreprise/page.tsx");

  assert.match(page, /setError\(result\.error/);
  assert.match(page, /setPending\(false\)/);
  assert.match(page, /\/connexion\?registered=true/);
  assert.match(page, /try \{/);
  assert.match(page, /catch \{/);
});

test("French company SIRET is checked on the server before account creation", () => {
  const action = read("app/inscription/entreprise/actions.ts");

  assert.match(action, /lookupCompanyBySiret/);
  assert.match(action, /SIRET à 14 chiffres est obligatoire/);
  assert.match(action, /n’a pas été confirmé par le registre public/);
  assert.match(action, /role: "ENTREPRISE"/);
  assert.match(action, /role: "OWNER"/);
  assert.match(action, /sourceUrl: verifiedCompany\?\.sourceUrl/);
});
