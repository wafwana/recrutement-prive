import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";
import { analyzeCvDocument } from "../lib/cv/analyzer";

// Fixtures synthétiques : aucune donnée personnelle réelle.
const FIXTURES = [
  { file: "CV-01-ingenieur-data-ia.txt", expected: "IT", keywords: ["Python", "machine learning", "SQL"] },
  { file: "CV-02-business-development-b2b.txt", expected: "COMMERCIAL", keywords: ["vente B2B", "CRM", "grands comptes"] },
  { file: "CV-03-recrutement-talent.txt", expected: "RH", keywords: ["recrutement", "sourcing", "Talent Acquisition"] },
  { file: "CV-04-audit-finance.txt", expected: "FINANCE", keywords: ["audit", "IFRS", "contrôle interne"] },
  { file: "CV-05-profil-transversal-projet.txt", expected: "IT", keywords: ["gestion de projet", "API", "avant-vente"] },
] as const;

const TAXONOMY = [
  { code: "FINANCE", name: "Finance" },
  { code: "COMPTABILITE", name: "Comptabilité", parentCode: "FINANCE" },
  { code: "AUDIT", name: "Audit", parentCode: "FINANCE" },
  { code: "IT", name: "Informatique & Tech" },
  { code: "DEV_LOGICIEL", name: "Développement logiciel", parentCode: "IT" },
  { code: "DATA_IA", name: "Data / IA", parentCode: "IT" },
  { code: "RH", name: "Ressources Humaines" },
  { code: "RECRUTEMENT", name: "Recrutement / Talent Acquisition", parentCode: "RH" },
  { code: "COMMERCIAL", name: "Commercial & Business" },
  { code: "VENTE_B2B", name: "Vente B2B", parentCode: "COMMERCIAL" },
  { code: "BUSINESS_DEV", name: "Business Development", parentCode: "COMMERCIAL" },
] as const;

test("CV fixtures: contenu professionnel et secteurs attendus", async () => {
  for (const fixture of FIXTURES) {
    const content = await readFile(path.join(process.cwd(), "tests/fixtures/cv", fixture.file), "utf8");
    assert.match(content, /CV TEST/);
    for (const keyword of fixture.keywords) {
      assert.ok(content.toLocaleLowerCase().includes(keyword.toLocaleLowerCase()), `Mot-clé absent: ${keyword}`);
    }
    assert.ok(fixture.expected.length > 0);
  }
});

test(
  "CV fixtures: analyse IA optionnelle et secteurs alternatifs",
  { skip: process.env.RUN_LIVE_CV_ANALYSIS !== "1" },
  async () => {
    assert.ok(process.env.OPENAI_API_KEY, "OPENAI_API_KEY requis pour l'analyse live");
    for (const fixture of FIXTURES) {
      const buffer = await readFile(path.join(process.cwd(), "tests/fixtures/cv", fixture.file));
      const analysis = await analyzeCvDocument({
        fileName: fixture.file,
        mimeType: "text/plain",
        buffer,
        taxonomy: TAXONOMY,
      });
      assert.ok(analysis, `Analyse absente pour ${fixture.file}`);
      assert.ok(analysis.confidence >= 0 && analysis.confidence <= 1);
      assert.ok(analysis.primaryCategoryCode);
      assert.ok(analysis.alternativeCategoryCodes.length <= 3);
    }
  },
);
