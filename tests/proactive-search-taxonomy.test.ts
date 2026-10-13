import test from "node:test";
import assert from "node:assert/strict";
import { RP_TAXONOMY } from "@/lib/taxonomy/rp-taxonomy";
import { buildProfessionRoot } from "@/lib/cv/folders";
import { classifyProactiveCandidate } from "@/lib/sourcing/proactive-classification";

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

test("proactive classification requires evidence from headline or declared skills", () => {
  const sector = RP_TAXONOMY.find((item) => item.code === "CASINOS_JEUX");
  assert.ok(sector);
  const croupier = sector.subcategories.find((item) => item.code === "CASINO_CROUPIER");
  assert.ok(croupier);

  const titleMatch = classifyProactiveCandidate({
    sector,
    profession: croupier,
    headline: "Experienced Croupier",
    skills: [],
  });
  assert.equal(titleMatch.confidence, "HIGH");
  assert.equal(titleMatch.isClassified, true);
  assert.equal(titleMatch.targetProfession?.code, "CASINO_CROUPIER");

  const skillMatch = classifyProactiveCandidate({
    sector,
    profession: croupier,
    headline: "Casino operations",
    skills: ["Croupier"],
  });
  assert.equal(skillMatch.confidence, "MEDIUM");
  assert.equal(skillMatch.isClassified, true);

  const queryOnlyMatch = classifyProactiveCandidate({
    sector,
    profession: croupier,
    headline: "TypeScript engineer",
    skills: ["TypeScript"],
  });
  assert.equal(queryOnlyMatch.confidence, "LOW");
  assert.equal(queryOnlyMatch.isClassified, false);
  assert.equal(queryOnlyMatch.targetProfession, undefined);
});

test("sector-level search selects a specialty only when the public profile supports it", () => {
  const sector = RP_TAXONOMY.find((item) => item.code === "CASINOS_JEUX");
  assert.ok(sector);
  const result = classifyProactiveCandidate({
    sector,
    headline: "Technicien",
    skills: ["Technicien machines à sous"],
  });
  assert.equal(result.targetProfession?.code, "CASINO_TECHNICIEN_MACHINES");
  assert.equal(result.confidence, "MEDIUM");
  assert.equal(result.isClassified, true);
});


test("CV-backed proactive classification states that evidence came from the analyzed CV", () => {
  const sector = RP_TAXONOMY.find((item) => item.code === "CASINOS_JEUX");
  assert.ok(sector);
  const croupier = sector.subcategories.find((item) => item.code === "CASINO_CROUPIER");
  assert.ok(croupier);

  const result = classifyProactiveCandidate({
    sector,
    profession: croupier,
    headline: "Expérience professionnelle",
    skills: ["Croupier", "Gestion de table"],
    cvAnalyzed: true,
  });

  assert.equal(result.isClassified, true);
  assert.equal(result.confidence, "MEDIUM");
  assert.match(result.rationale, /CV analysé/);
});
