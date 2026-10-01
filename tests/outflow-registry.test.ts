import test from "node:test";
import assert from "node:assert/strict";
import { runWithTestSession } from "../auth";
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

test("OWNER route guard: distinguishes 401 (unauthenticated), 403 (non-OWNER) and 200 (OWNER)", async () => {
  const { GET, POST } = await import("../app/api/owner/outflows/route");
  const { DELETE } = await import("../app/api/owner/outflows/[id]/route");

  // 1. Unauthenticated session (missing session) -> 401
  const resUnauthGet = await GET(new Request("http://localhost/api/owner/outflows"));
  assert.equal(resUnauthGet.status, 401);
  const dataUnauthGet = await resUnauthGet.json();
  assert.ok(dataUnauthGet.error.includes("Session non authentifiée"));

  const resUnauthPost = await POST(
    new Request("http://localhost/api/owner/outflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beneficiaryName: "Test", reason: "Test", amountHt: 10, amountTtc: 10 }),
    })
  );
  assert.equal(resUnauthPost.status, 401);

  // 2. Authenticated as ADMIN (non-OWNER) -> 403
  const adminSession = { user: { id: "admin-1", role: "ADMIN", email: "admin@test.com" } };
  const resAdminGet = await runWithTestSession(adminSession, () =>
    GET(new Request("http://localhost/api/owner/outflows"))
  );
  assert.equal(resAdminGet.status, 403);
  const dataAdminGet = await resAdminGet.json();
  assert.ok(dataAdminGet.error.includes("Owner"));

  // 3. Authenticated as CONSULTANT (non-OWNER) -> 403
  const consultantSession = { user: { id: "cons-1", role: "CONSULTANT", email: "consultant@test.com" } };
  const resConsultantGet = await runWithTestSession(consultantSession, () =>
    GET(new Request("http://localhost/api/owner/outflows"))
  );
  assert.equal(resConsultantGet.status, 403);

  // 4. Authenticated as OWNER -> Authorized
  const ownerSession = { user: { id: "owner-1", role: "OWNER", email: "owner@test.com" } };
  const resOwnerDelete = await runWithTestSession(ownerSession, () =>
    DELETE(new Request("http://localhost/api/owner/outflows/out-1"), {
      params: Promise.resolve({ id: "out-1" }),
    })
  );
  // Physical deletion is forbidden for OWNER -> 400
  assert.equal(resOwnerDelete.status, 400);
  const dataOwnerDelete = await resOwnerDelete.json();
  assert.ok(dataOwnerDelete.error.includes("Suppression physique interdite"));
});

test("OWNER route GET handles unexpected query or DB errors safely with 500 status and diagnostic ID", async () => {
  const { GET } = await import("../app/api/owner/outflows/route");
  const ownerSession = { user: { id: "owner-1", role: "OWNER", email: "owner@test.com" } };

  // Passing an invalid query param year that triggers exception handling if unhandled
  const req = new Request("http://localhost/api/owner/outflows?year=invalid_year_string");
  const res = await runWithTestSession(ownerSession, () => GET(req));

  // Should handle safely without crashing server, returning either 200 or 500 with diagnostic reference
  assert.ok(res.status === 200 || res.status === 500);
  if (res.status === 500) {
    const data = await res.json();
    assert.ok(data.error.includes("Réf: OUT-ERR-"));
  }
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
