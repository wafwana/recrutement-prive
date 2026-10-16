import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { discoverInstitutionalPartners } from "../lib/partenaires/sourcing";

test("institutional partner directory filters its curated catalogue without creating recruitment-platform partners", async () => {
  const all = await discoverInstitutionalPartners();
  assert.ok(all.length > 0);
  assert.ok(all.some((item) => item.officialName === "CCI France International"));
  assert.ok(all.every((item) => item.officialName.trim().length > 0));
  assert.ok(all.every((item) => !/recrutement privé|recruitment platform/i.test(item.officialName)));

  const india = await discoverInstitutionalPartners({ country: "Inde" });
  assert.ok(india.length > 0);
  assert.ok(india.every((item) => item.country?.toLowerCase().includes("inde")));

  const filtered = await discoverInstitutionalPartners({ q: "CCI France International" });
  assert.ok(filtered.some((item) => item.officialName === "CCI France International"));
  assert.deepEqual(await discoverInstitutionalPartners({ q: "definitely-not-an-institution-xyz" }), []);
});

test("partner sourcing UI describes the current catalogue honestly and provides accessible results and reset actions", () => {
  const client = fs.readFileSync(path.join(process.cwd(), "app/espace/owner/partenaires/sourcing/SourcingClient.tsx"), "utf8");
  assert.match(client, /Ce bouton ne lance pas de collecte Web en direct/);
  assert.match(client, /Filtrer le répertoire/);
  assert.match(client, /Effacer les filtres/);
  assert.match(client, /role="status" aria-live="polite"/);
  assert.match(client, /htmlFor="partner-directory-query"/);
  assert.match(client, /Importé pendant cette session/);
});
