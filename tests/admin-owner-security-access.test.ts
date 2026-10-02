import test from "node:test";
import assert from "node:assert/strict";
import { runWithTestSession, type AuthSession } from "../auth";
import { hasPermission } from "../lib/auth/permissions";
import { GET as getPermissions } from "../app/api/owner/permissions/route";
import { GET as getOutflows } from "../app/api/owner/outflows/route";
import { POST as postExclusions } from "../app/api/owner/exclusions/route";
import { POST as postGlobalJobs } from "../app/api/sourcing/global-jobs/route";
import { POST as postCandidateActions } from "../app/api/sourcing/candidate-actions/route";

const ownerSession: AuthSession = {
  user: { id: "owner_usr_001", role: "OWNER", name: "Owner Test", email: "owner@recrutement-prive.com" },
};

const unconfiguredAdminSession: AuthSession = {
  user: { id: "admin_usr_unconfigured_999", role: "ADMIN", name: "Admin Unconfigured", email: "unconfigured.admin@recrutement-prive.fr" },
};

const consultantSession: AuthSession = {
  user: { id: "consultant_usr_001", role: "CONSULTANT", name: "Consultant Test", email: "consultant@recrutement-prive.fr" },
};

test("Governance Security: OWNER possesses supreme authority across all permissions natively", async () => {
  assert.equal(await hasPermission("owner_usr_001", "OWNER", "SOURCING"), true);
  assert.equal(await hasPermission("owner_usr_001", "OWNER", "OFFRES_VIVIER"), true);
  assert.equal(await hasPermission("owner_usr_001", "OWNER", "ARCHIVAGE"), true);
  assert.equal(await hasPermission("owner_usr_001", "OWNER", "PRE_COMPTABILITE"), true);
  assert.equal(await hasPermission("owner_usr_001", "OWNER", "PLATFORM_SETTINGS"), true);
});

test("Governance Security: Unconfigured ADMIN is denied SOURCING and OFFRES_VIVIER permissions by default", async () => {
  assert.equal(await hasPermission("admin_usr_unconfigured_999", "ADMIN", "SOURCING"), false);
  assert.equal(await hasPermission("admin_usr_unconfigured_999", "ADMIN", "OFFRES_VIVIER"), false);
});

test("Route Guard Security: GET /api/owner/permissions route handler strictly restricts to OWNER role", async () => {
  const adminRes = await runWithTestSession(unconfiguredAdminSession, () => getPermissions());
  assert.equal(adminRes.status, 403);
  const adminData = await adminRes.json();
  assert.equal(adminData.error, "Accès réservé à l'Owner.");

  const consultantRes = await runWithTestSession(consultantSession, () => getPermissions());
  assert.equal(consultantRes.status, 403);
});

test("Route Guard Security: GET /api/owner/outflows route handler strictly restricts to OWNER role", async () => {
  const req = new Request("http://localhost:3000/api/owner/outflows");

  const adminRes = await runWithTestSession(unconfiguredAdminSession, () => getOutflows(req));
  assert.equal(adminRes.status, 403);
  const adminData = await adminRes.json();
  assert.ok(adminData.error.includes("Accès strictement réservé à l'Owner"));

  const consultantRes = await runWithTestSession(consultantSession, () => getOutflows(req));
  assert.equal(consultantRes.status, 403);
});

test("Route Guard Security: POST /api/owner/exclusions route handler strictly restricts to OWNER role", async () => {
  const req = new Request("http://localhost:3000/api/owner/exclusions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetType: "CANDIDATE", targetId: "cand_1", action: "EXCLUDE", reason: "Test reason" }),
  });

  const adminRes = await runWithTestSession(unconfiguredAdminSession, () => postExclusions(req));
  assert.equal(adminRes.status, 403);
  const adminData = await adminRes.json();
  assert.equal(adminData.error, "Accès strictement réservé à l'Owner.");
});

test("Route Guard Security: POST /api/sourcing/global-jobs rejects unconfigured ADMIN without SOURCING permission", async () => {
  const req = new Request("http://localhost:3000/api/sourcing/global-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const adminRes = await runWithTestSession(unconfiguredAdminSession, () => postGlobalJobs(req));
  assert.equal(adminRes.status, 403);
  const adminData = await adminRes.json();
  assert.equal(adminData.error, "Permission de sourcing non accordée par l'Owner.");
});

test("Route Guard Security: POST /api/sourcing/candidate-actions rejects unconfigured ADMIN without SOURCING permission", async () => {
  const req = new Request("http://localhost:3000/api/sourcing/candidate-actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidateId: "sourced_cand_1", action: "VALIDATE" }),
  });

  const adminRes = await runWithTestSession(unconfiguredAdminSession, () => postCandidateActions(req));
  assert.equal(adminRes.status, 403);
  const adminData = await adminRes.json();
  assert.equal(adminData.error, "Permission de sourcing non accordée.");
});
