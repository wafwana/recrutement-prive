import test from "node:test";
import assert from "node:assert/strict";
import { runWithTestSession, type AuthSession } from "../auth";
import { GET as getAdminPartners, POST as postAdminPartner } from "../app/api/admin/partenaires/route";
import { GET as getAdminPartner, PATCH as patchAdminPartner, DELETE as deleteAdminPartner } from "../app/api/admin/partenaires/[id]/route";
import { POST as postAdminPartnerContact, DELETE as deleteAdminPartnerContact } from "../app/api/admin/partenaires/[id]/contacts/route";
import { GET as getAdminPartnerAgreements, POST as postAdminPartnerAgreement } from "../app/api/admin/partenaires/[id]/accords/route";
import { PATCH as patchAdminPartnerAgreement, DELETE as deleteAdminPartnerAgreement } from "../app/api/admin/partenaires/[id]/accords/[accordId]/route";
import { GET as getAdminPartnerSourcing, POST as postAdminPartnerSourcing } from "../app/api/admin/partenaires/sourcing/route";
import { GET as getOwnerPartner } from "../app/api/owner/partenaires/[id]/route";
import { GET as getOwnerPartnerSourcing } from "../app/api/owner/partenaires/sourcing/route";

const ownerSession: AuthSession = {
  user: { id: "owner_partner_guard_001", role: "OWNER", name: "Owner Test", email: "owner-guard@example.invalid" },
};
const consultantSession: AuthSession = {
  user: { id: "consultant_partner_guard_001", role: "CONSULTANT", name: "Consultant Test", email: "consultant-guard@example.invalid" },
};
const unconfiguredAdminSession: AuthSession = {
  user: { id: "admin_partner_guard_unconfigured_771", role: "ADMIN", name: "Unconfigured Admin", email: "admin-guard@example.invalid" },
};

function req(path: string, method = "GET", body?: unknown): Request {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const adminRouteCalls: Array<{ name: string; call: (session: AuthSession) => Promise<Response> }> = [
  { name: "partner collection GET", call: (session) => runWithTestSession(session, () => getAdminPartners(req("/api/admin/partenaires"))) },
  { name: "partner collection POST", call: (session) => runWithTestSession(session, () => postAdminPartner(req("/api/admin/partenaires", "POST", { officialName: "Test Org", category: "UNIVERSITES_ECOLES" }))) },
  { name: "partner detail GET", call: (session) => runWithTestSession(session, () => getAdminPartner(req("/api/admin/partenaires/p_test"), { params: Promise.resolve({ id: "p_test" }) })) },
  { name: "partner detail PATCH", call: (session) => runWithTestSession(session, () => patchAdminPartner(req("/api/admin/partenaires/p_test", "PATCH", { newStatus: "CONTACTED" }), { params: Promise.resolve({ id: "p_test" }) })) },
  { name: "partner detail DELETE", call: (session) => runWithTestSession(session, () => deleteAdminPartner(req("/api/admin/partenaires/p_test", "DELETE"), { params: Promise.resolve({ id: "p_test" }) })) },
  { name: "partner contacts POST", call: (session) => runWithTestSession(session, () => postAdminPartnerContact(req("/api/admin/partenaires/p_test/contacts", "POST", { name: "Contact test" }), { params: Promise.resolve({ id: "p_test" }) })) },
  { name: "partner contacts DELETE", call: (session) => runWithTestSession(session, () => deleteAdminPartnerContact(req("/api/admin/partenaires/p_test/contacts?contactId=c_test", "DELETE"), { params: Promise.resolve({ id: "p_test" }) })) },
  { name: "partner agreements GET", call: (session) => runWithTestSession(session, () => getAdminPartnerAgreements(req("/api/admin/partenaires/p_test/accords"), { params: Promise.resolve({ id: "p_test" }) })) },
  { name: "partner agreements POST", call: (session) => runWithTestSession(session, () => postAdminPartnerAgreement(req("/api/admin/partenaires/p_test/accords", "POST", { title: "Test", agreementType: "OTHER" }), { params: Promise.resolve({ id: "p_test" }) })) },
  { name: "partner agreement PATCH", call: (session) => runWithTestSession(session, () => patchAdminPartnerAgreement(req("/api/admin/partenaires/p_test/accords/a_test", "PATCH", { title: "Test" }), { params: Promise.resolve({ id: "p_test", accordId: "a_test" }) })) },
  { name: "partner agreement DELETE", call: (session) => runWithTestSession(session, () => deleteAdminPartnerAgreement(req("/api/admin/partenaires/p_test/accords/a_test", "DELETE"), { params: Promise.resolve({ id: "p_test", accordId: "a_test" }) })) },
  { name: "partner sourcing GET", call: (session) => runWithTestSession(session, () => getAdminPartnerSourcing(req("/api/admin/partenaires/sourcing"))) },
  { name: "partner sourcing POST", call: (session) => runWithTestSession(session, () => postAdminPartnerSourcing(req("/api/admin/partenaires/sourcing", "POST", { partner: { officialName: "Test Org", category: "UNIVERSITES_ECOLES" } }))) },
];

test("ADMIN partner APIs reject OWNER and CONSULTANT roles on every exposed method", async () => {
  for (const session of [ownerSession, consultantSession]) {
    for (const route of adminRouteCalls) {
      const response = await route.call(session);
      assert.equal(response.status, 403, `${route.name} must reject role ${session.user?.role}`);
    }
  }
});

test("ADMIN partner APIs fail closed when ADMIN lacks PARTNERS_MANAGE", async () => {
  for (const route of adminRouteCalls) {
    const response = await route.call(unconfiguredAdminSession);
    assert.equal(response.status, 403, `${route.name} must reject an ADMIN without PARTNERS_MANAGE`);
  }
});

test("Owner partner namespace rejects ADMIN and CONSULTANT sessions", async () => {
  const ownerRoutes: Array<{ name: string; call: (session: AuthSession) => Promise<Response> }> = [
    { name: "owner partner detail", call: (session) => runWithTestSession(session, () => getOwnerPartner(req("/api/owner/partenaires/p_test"), { params: Promise.resolve({ id: "p_test" }) })) },
    { name: "owner partner sourcing", call: (session) => runWithTestSession(session, () => getOwnerPartnerSourcing(req("/api/owner/partenaires/sourcing"))) },
  ];
  for (const session of [unconfiguredAdminSession, consultantSession]) {
    for (const route of ownerRoutes) {
      const response = await route.call(session);
      assert.equal(response.status, 403, `${route.name} must reject role ${session.user?.role}`);
    }
  }
});
