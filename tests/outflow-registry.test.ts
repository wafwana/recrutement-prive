import test from "node:test";
import assert from "node:assert/strict";
import {
  validateOutflowAmounts,
  evaluateOutflowStatus,
  exportOutflowsToCsv,
} from "../lib/accounting/outflow-service";

test("validateOutflowAmounts verifies HT + TVA = TTC exactness", () => {
  assert.equal(validateOutflowAmounts(100, 20, 120), true);
  assert.equal(validateOutflowAmounts(100, 20, 120.01), true); // within 0.02 tolerance
  assert.equal(validateOutflowAmounts(100, 20, 130), false);
  assert.equal(validateOutflowAmounts(-100, 0, -100), false);
});

test("evaluateOutflowStatus detects missing categories or documents as A_COMPLETER", () => {
  // Status is PAYE, but category is missing
  assert.equal(evaluateOutflowStatus("PAYE", null, "https://doc.pdf", null), "A_COMPLETER");

  // Status is PAYE, but doc is missing
  assert.equal(evaluateOutflowStatus("PAYE", "604000", null, null), "A_COMPLETER");

  // Status is PAYE with both category and doc present
  assert.equal(evaluateOutflowStatus("PAYE", "604000", "https://doc.pdf", null), "PAYE");

  // Status is ANNULE (cancellation takes precedence)
  assert.equal(evaluateOutflowStatus("ANNULE", null, null, null), "ANNULE");
});

test("OWNER route guard checks GET and POST /api/owner/outflows block non-OWNER access", async () => {
  const { GET, POST } = await import("../app/api/owner/outflows/route");

  // Call GET as unauthenticated / non-OWNER
  const resGet = await GET(new Request("http://localhost/api/owner/outflows"));
  assert.equal(resGet.status, 403);
  const dataGet = await resGet.json();
  assert.ok(dataGet.error.includes("Owner"));

  // Call POST as non-OWNER
  const resPost = await POST(new Request("http://localhost/api/owner/outflows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beneficiaryName: "Test", reason: "Test", amountHt: 10, amountTtc: 10 }),
  }));
  assert.equal(resPost.status, 403);
});

test("exportOutflowsToCsv generates semicolon separated CSV with expected columns", () => {
  const sample = [
    {
      outflowNumber: "OUT-20261001-0001",
      operationDate: new Date("2026-10-01"),
      paymentDate: new Date("2026-10-01"),
      beneficiaryName: "Prestataire Alpha",
      beneficiaryEmail: "alpha@test.com",
      reason: "Mission de développement",
      category: "622600",
      originModule: "PRESTATAIRE",
      amountHt: 1000,
      amountTva: 200,
      amountTtc: 1200,
      currency: "EUR",
      paymentMethod: "VIREMENT",
      referenceNumber: "FAC-001",
      status: "PAYE",
      reconciliationStatus: "NON_RAPPROCHE",
      documentUrl: "https://example.com/fac.pdf",
    },
  ];

  const csv = exportOutflowsToCsv(sample);
  assert.ok(csv.includes("N° Opération;Date Opération"));
  assert.ok(csv.includes('"OUT-20261001-0001"'));
  assert.ok(csv.includes('"Prestataire Alpha"'));
  assert.ok(csv.includes('"1200.00"'));
});
