import test from "node:test";
import assert from "node:assert/strict";
import { buildCandidateFolderFromAnalysis, resolveCvTaxonomySelection } from "@/lib/cv/folders";

const taxonomy = [
  { code: "FINANCE", name: "Finance", parentCode: null },
  { code: "COMPTABILITE", name: "Comptabilité", parentCode: "FINANCE" },
  { code: "AUDIT", name: "Audit", parentCode: "FINANCE" },
  { code: "RH", name: "Ressources Humaines", parentCode: null },
  { code: "RECRUTEMENT", name: "Recrutement", parentCode: "RH" },
  { code: "FORMATION", name: "Formation", parentCode: "RH" },
] as const;

test("CV taxonomy selection keeps only subcategories belonging to the primary sector", () => {
  const selected = resolveCvTaxonomySelection({
    primaryCategoryCode: "FINANCE",
    subCategoryCodes: ["RECRUTEMENT", "COMPTABILITE", "FORMATION", "AUDIT"],
  }, [...taxonomy]);

  assert.deepEqual(selected, {
    primaryCategoryCode: "FINANCE",
    subCategoryCodes: ["COMPTABILITE", "AUDIT"],
  });
});

test("CV folder path uses the first valid child of the selected sector", () => {
  const path = buildCandidateFolderFromAnalysis({
    primaryCategoryCode: "FINANCE",
    subCategoryCodes: ["RECRUTEMENT", "COMPTABILITE", "FORMATION"],
  }, [...taxonomy], 2026, "CV");

  assert.equal(path, "CANDIDATS/FINANCE/COMPTABILITE/DOSSIER_CANDIDAT/CV/2026");
});

test("unknown or child-level primary categories fail closed to the review folder", () => {
  assert.equal(
    buildCandidateFolderFromAnalysis({ primaryCategoryCode: "UNKNOWN", subCategoryCodes: ["COMPTABILITE"] }, [...taxonomy], 2026),
    "CANDIDATS/A_CLASSER/A_VERIFIER/DOSSIER_CANDIDAT/CV/2026",
  );
  assert.equal(
    buildCandidateFolderFromAnalysis({ primaryCategoryCode: "COMPTABILITE", subCategoryCodes: ["AUDIT"] }, [...taxonomy], 2026),
    "CANDIDATS/A_CLASSER/A_VERIFIER/DOSSIER_CANDIDAT/CV/2026",
  );
});
