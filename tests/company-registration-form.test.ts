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
  assert.match(lookup, /required=\{required\}/);\n  assert.match(lookup, /SIREN ou SIRET/);\n  assert.match(lookup, /normalized.length !== 9 && normalized.length !== 14/);\n  assert.match(lookup, /identifier=\$\{encodeURIComponent\(normalized\)\}/);
});

test("SIRET lookup button is outside the label and explicitly cannot submit the parent form", () => {
  const lookup = read("app/components/CompanySiretLookup.tsx");

  assert.match(lookup, /htmlFor="company-siret"/);
  assert.match(lookup, /id="company-siret"/);
  assert.match(lookup, /type="button"/);
  assert.match(lookup, /onClick=\{lookup\}/);
  assert.match(lookup, /aria-busy=\{pending\}/);
  assert.match(lookup, /role="status"/);
  assert.match(lookup, /aria-live="polite"/);
  assert.doesNotMatch(lookup, /<label[^>]*>[\s\S]*?<button[\s\S]*?<\/label>/);
});

test("SIRET lookup displays provider and network errors instead of failing silently", () => {
  const lookup = read("app/components/CompanySiretLookup.tsx");

  assert.match(lookup, /response\.json\(\)\.catch\(\(\) => null\)/);
  assert.match(lookup, /La recherche a échoué/);
  assert.match(lookup, /La recherche est momentanément impossible/);
  assert.match(lookup, /setMessageIsError\(true\)/);
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

test("public registry lookup supports SIREN and resolves the head-office SIRET", () => {
  const registry = read("lib/company/public-registry.ts");
  const route = read("app/api/company/siret/route.ts");

  assert.match(registry, /export async function lookupCompanyBySiren/);
  assert.match(registry, /text\(item\.siren\) === siren/);
  assert.match(registry, /text\(siege\?\.siret\)/);
  assert.match(route, /lookupCompanyBySiren/);
  assert.match(route, /identifier/);
  assert.match(route, /SIREN à 9 chiffres ou un SIRET à 14 chiffres/);
});
