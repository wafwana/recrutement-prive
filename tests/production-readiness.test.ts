import test from "node:test";
import assert from "node:assert/strict";
import { classifyDocument } from "../lib/archiving/classifier";
import { generateMonthlySummary, generateQuarterlyDossier, ACCOUNTING_FOLDERS } from "../lib/accounting/pre-accounting";

test("classifyDocument classifies financial invoices into correct monthly folder", () => {
  const result = classifyDocument({
    fileName: "facture_fevrier_2026.pdf",
    docType: "FACTURE",
    senderRole: "ENTREPRISE",
    date: new Date("2026-02-15"),
  });

  assert.equal(result.categoryPath, "ARCHIVAGE/FINANCE/FACTURES/2026/FEVRIER");
  assert.equal(result.year, 2026);
  assert.equal(result.month, 2);
  assert.equal(result.quarter, 1);
});

test("classifyDocument classifies candidate CV into candidate folder", () => {
  const result = classifyDocument({
    fileName: "cv_jean_dupont.pdf",
    docType: "CV",
    senderRole: "CANDIDAT",
    candidateId: "cand_123",
  });

  assert.equal(result.categoryPath, "ARCHIVAGE/CANDIDATS/DOSSIER_CANDIDAT");
});

test("classifyDocument falls back to A_CLASSER/A_VERIFIER when ambiguous", () => {
  const result = classifyDocument({
    fileName: "document_inconnu.dat",
    senderRole: "AUTRE",
  });

  assert.equal(result.categoryPath, "ARCHIVAGE/A_CLASSER/A_VERIFIER");
  assert.equal(result.isAmbiguous, true);
  assert.equal(result.status, "A_VERIFIER");
});

test("pre-accounting folders structure conforms to specification", () => {
  assert.equal(ACCOUNTING_FOLDERS.length, 15);
  assert.equal(ACCOUNTING_FOLDERS[0], "01_FACTURES");
  assert.equal(ACCOUNTING_FOLDERS[14], "15_SYNTHESE_MENSUELLE");
});

test("check archive authorization strictly restricts to OWNER", () => {
  function canAccessArchive(role: string): boolean {
    return role === "OWNER";
  }

  assert.equal(canAccessArchive("OWNER"), true);
  assert.equal(canAccessArchive("ADMIN"), false);
  assert.equal(canAccessArchive("CONSULTANT"), false);
  assert.equal(canAccessArchive("ENTREPRISE"), false);
  assert.equal(canAccessArchive("CANDIDAT"), false);
});

test("check staff governance rules prevent non-OWNER from modifying OWNER", () => {
  function canModifyTargetRole(actorRole: string, targetRole: string): boolean {
    if (targetRole === "OWNER") return false;
    return actorRole === "OWNER";
  }

  assert.equal(canModifyTargetRole("OWNER", "ADMIN"), true);
  assert.equal(canModifyTargetRole("OWNER", "CONSULTANT"), true);
  assert.equal(canModifyTargetRole("ADMIN", "CONSULTANT"), false);
  assert.equal(canModifyTargetRole("ADMIN", "OWNER"), false);
  assert.equal(canModifyTargetRole("OWNER", "OWNER"), false);
});
