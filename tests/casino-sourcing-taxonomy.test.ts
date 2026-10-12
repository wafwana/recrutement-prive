import assert from "node:assert/strict";
import { test } from "node:test";
import { RP_TAXONOMY } from "../lib/taxonomy/rp-taxonomy";
import { buildCandidateFolder, buildProfessionRoot } from "../lib/cv/folders";
import { POST as globalCandidatesPost } from "../app/api/sourcing/global-candidates/route";
import { runWithTestSession } from "../auth";

test("Taxonomy coverage: all sectors have non-empty subcategories with unique codes", () => {
  const sectorCodes = new Set<string>();
  const subCategoryCodes = new Set<string>();

  for (const sector of RP_TAXONOMY) {
    assert.ok(sector.code, "Sector must have a code");
    assert.ok(!sectorCodes.has(sector.code), `Duplicate sector code found: ${sector.code}`);
    sectorCodes.add(sector.code);

    assert.ok(sector.subcategories.length > 0, `Sector ${sector.code} must have at least 1 subcategory`);

    for (const sub of sector.subcategories) {
      assert.ok(sub.code, `Subcategory in ${sector.code} must have a code`);
      assert.ok(!subCategoryCodes.has(sub.code), `Duplicate subcategory code found: ${sub.code}`);
      subCategoryCodes.add(sub.code);
    }
  }

  // Confirm CASINOS_JEUX sector is present and correctly populated
  const casinoSector = RP_TAXONOMY.find((s) => s.code === "CASINOS_JEUX");
  assert.ok(casinoSector, "CASINOS_JEUX sector must exist in RP_TAXONOMY");
  assert.equal(casinoSector.subcategories.length, 7, "CASINOS_JEUX must have 7 subcategories");
});

test("Candidate folder generation builds canonical taxonomy paths", () => {
  const folder = buildCandidateFolder({
    sectorCode: "CASINOS_JEUX",
    professionCode: "EXPLOITATION_JEUX",
    year: 2026,
    documentKind: "CV",
  });

  assert.equal(folder, "CANDIDATS/CASINOS_JEUX/EXPLOITATION_JEUX/DOSSIER_CANDIDAT/CV/2026");

  const root = buildProfessionRoot("CASINOS_JEUX", "EXPLOITATION_JEUX");
  assert.equal(root, "CANDIDATS/CASINOS_JEUX/EXPLOITATION_JEUX/DOSSIER_CANDIDAT");
});

test("Global candidates sourcing endpoint permission checks and autonomous sector/profession search", async () => {
  // Test unauthenticated access fails with 403
  await runWithTestSession({}, async () => {
    const req = new Request("http://localhost/api/sourcing/global-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectorCode: "CASINOS_JEUX",
        professionCode: "EXPLOITATION_JEUX",
        query: "Croupier",
      }),
    });
    const res = await globalCandidatesPost(req);
    assert.equal(res.status, 403);
  });

  // Test authorized OWNER access triggers autonomous sourcing
  await runWithTestSession({ user: { id: "owner-user-id", role: "OWNER" } }, async () => {
    const req = new Request("http://localhost/api/sourcing/global-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectorCode: "CASINOS_JEUX",
        professionCode: "EXPLOITATION_JEUX",
        query: "Croupier",
      }),
    });
    const res = await globalCandidatesPost(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok("activeSourcesCount" in data);
  });
});
