import test from "node:test";
import assert from "node:assert/strict";
import { RP_TAXONOMY } from "@/lib/taxonomy/rp-taxonomy";
import { buildProfessionRoot } from "@/lib/cv/folders";

test("Casino & gaming is a dedicated sector with the required initial professions", () => {
  const sector = RP_TAXONOMY.find((item) => item.code === "CASINOS_JEUX");
  assert.ok(sector, "CASINOS_JEUX sector must exist");
  const codes = new Set(sector.subcategories.map((item) => item.code));
  for (const code of [
    "CASINO_CROUPIER",
    "CASINO_CHEF_TABLE",
    "CASINO_INSPECTEUR_JEUX",
    "CASINO_RESPONSABLE_JEUX",
    "CASINO_TECHNICIEN_MACHINES",
    "CASINO_TECHNICIEN_JEUX_ELECTRONIQUES",
    "CASINO_TECHNICIEN_TABLES_ELECTRONIQUES",
    "CASINO_PARC_MACHINES",
    "CASINO_CAISSE_CHANGE",
    "CASINO_RESPONSABLE_CAISSE",
    "CASINO_ACCUEIL_VIP",
    "CASINO_SECURITE_SURVEILLANCE",
    "CASINO_CONFORMITE_KYC",
    "CASINO_HOSPITALITE",
    "CASINO_DIRECTION",
    "CASINO_IT_RESEAUX",
    "CASINO_MAINTENANCE_BATIMENT",
    "CASINO_FONCTIONS_SUPPORT",
  ]) assert.ok(codes.has(code), `Missing casino profession: ${code}`);
});

test("taxonomy category codes remain globally unique and casino dossiers use the existing folder builder", () => {
  const allCodes = RP_TAXONOMY.flatMap((sector) => [sector.code, ...sector.subcategories.map((item) => item.code)]);
  assert.equal(new Set(allCodes).size, allCodes.length, "Taxonomy codes must not duplicate existing categories");
  assert.equal(
    buildProfessionRoot("CASINOS_JEUX", "CASINO_CROUPIER"),
    "CANDIDATS/CASINOS_JEUX/CASINO_CROUPIER/DOSSIER_CANDIDAT",
  );
});
