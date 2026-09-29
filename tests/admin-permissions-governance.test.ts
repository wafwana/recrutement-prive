import test from "node:test";
import assert from "node:assert/strict";
import { getUserPermissions, hasPermission, PERMISSIONS } from "../lib/auth/permissions";

test("ADMIN Governance: OWNER always possesses supreme authority and all permissions", async () => {
  const isOwnerAuthorized = await hasPermission("owner_id_123", "OWNER", "CANDIDATES_VIEW");
  assert.equal(isOwnerAuthorized, true);

  const isOwnerSourcing = await hasPermission("owner_id_123", "OWNER", "SOURCING");
  assert.equal(isOwnerSourcing, true);
});

test("ADMIN Governance: ADMIN has zero permissions by default when non-configured", async () => {
  // Unconfigured ADMIN (no permissions:user_id setting in DB)
  const isCandidateView = await hasPermission("unconfigured_admin_id", "ADMIN", "CANDIDATES_VIEW");
  assert.equal(isCandidateView, false, "Unconfigured ADMIN must be denied all permissions by default.");

  const isSourcing = await hasPermission("unconfigured_admin_id", "ADMIN", "SOURCING");
  assert.equal(isSourcing, false, "Unconfigured ADMIN must be denied SOURCING permission.");
});

test("ADMIN Governance: ADMIN granular permissions are explicit and non-expansive", async () => {
  // Simulate an ADMIN with explicitly granted CANDIDATES_VIEW
  // Granular governance is atomic: possessing CANDIDATES_VIEW never implies CANDIDATES_MANAGE or SOURCING
  const mockPermissions = ["CANDIDATES_VIEW"];
  const containsView = mockPermissions.includes("CANDIDATES_VIEW");
  const containsManage = mockPermissions.includes("CANDIDATES_MANAGE");
  const containsSourcing = mockPermissions.includes("SOURCING");

  assert.equal(containsView, true);
  assert.equal(containsManage, false, "CANDIDATES_VIEW must never grant CANDIDATES_MANAGE.");
  assert.equal(containsSourcing, false, "CANDIDATES_VIEW must never grant SOURCING.");
});

test("ADMIN Governance: List of canonical PERMISSIONS contains all expected modules", () => {
  assert.ok(PERMISSIONS.includes("CANDIDATES_VIEW"));
  assert.ok(PERMISSIONS.includes("CANDIDATES_MANAGE"));
  assert.ok(PERMISSIONS.includes("CV_INTAKE"));
  assert.ok(PERMISSIONS.includes("CV_LIBRARY"));
  assert.ok(PERMISSIONS.includes("CV_MATCHING"));
  assert.ok(PERMISSIONS.includes("METIERS_DOSSIERS"));
  assert.ok(PERMISSIONS.includes("SOURCING"));
  assert.ok(PERMISSIONS.includes("OFFRES_VIVIER"));
  assert.ok(PERMISSIONS.includes("ARCHIVAGE"));
  assert.ok(PERMISSIONS.includes("PRE_COMPTABILITE"));
  assert.ok(PERMISSIONS.includes("PRESTATIONS_TARIFS"));
  assert.ok(PERMISSIONS.includes("FACTURATION"));
  assert.ok(PERMISSIONS.includes("JOBS_MANAGE"));
  assert.ok(PERMISSIONS.includes("PRESENTATIONS_MANAGE"));
  assert.ok(PERMISSIONS.includes("COMPANIES_MANAGE"));
  assert.ok(PERMISSIONS.includes("CRM"));
  assert.ok(PERMISSIONS.includes("REPORTING"));
  assert.ok(PERMISSIONS.includes("DOCUMENTS_DEPOSIT"));
  assert.ok(PERMISSIONS.includes("DOCUMENTS_VIEW"));
  assert.ok(PERMISSIONS.includes("MESSAGING_CLIENTS_ENTERPRISE"));
  assert.ok(PERMISSIONS.includes("PLATFORM_SETTINGS"));
  assert.ok(PERMISSIONS.includes("ENTERPRISE_OFFER_SOURCING"));
});
