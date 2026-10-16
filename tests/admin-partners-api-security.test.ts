import test from "node:test";
import assert from "node:assert/strict";
import { runWithTestSession, type AuthSession } from "../auth";
import { GET as getAdminPartners } from "../app/api/admin/partenaires/route";
import { GET as getAdminPartner } from "../app/api/admin/partenaires/[id]/route";
import { POST as postAdminPartnerContact } from "../app/api/admin/partenaires/[id]/contacts/route";
import { GET as getAdminPartnerAgreements } from "../app/api/admin/partenaires/[id]/accords/route";
import { PATCH as patchAdminPartnerAgreement } from "../app/api/admin/partenaires/[id]/accords/[accordId]/route";
import { GET as getAdminPartnerSourcing } from "../app/api/admin/partenaires/sourcing/route";

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
  {
    name: "partner collection",
    call: (session) => runWithTestSession(session, () => getAdminPartners(req("/api/admin/partenaires"))),
  },
  {
    name: "partner detail",
    call: (session) => runWithTestSession(session, () =>
      getAdminPartner(req("/api/admin/partenaires/p_test"), { params: Promise.resolve({ id: "p_test" }) }),
    ),
  },
  {
    name: "partner contacts mutation",
    call: (session) => runWithTestSession(session, () =>
      postAdminPartnerContact(req("/api/admin/partenaires/p_test/contacts", "POST", { name: "Contact test" }), {
        params: Promise.resolve({ id: "p_test" }),
      }),
    ),
  },
  {
    name: "partner agreements",
    call: (session) => runWithTestSession(session, () =>
      getAdminPartnerAgreements(req("/api/admin/partenaires/p_test/accords"), { params: Promise.resolve({ id: "p_test" }) }),
    ),
  },
  {
    name: "partner agreement mutation",
    call: (session) => runWithTestSession(session, () =>
      patchAdminPartnerAgreement(req("/api/admin/partenaires/p_test/accords/a_test", "PATCH", { title: "Test" }), {
        params: Promise.resolve({ id: "p_test", accordId: "a_test" }),
      }),
    ),
  },
  {
    name: "partner sourcing",
    call: (session) => runWithTestSession(session, () => getAdminPartnerSourcing(req("/api/admin/partenaires/sourcing"))),
  },
];

test("ADMIN partner APIs never grant OWNER or CONSULTANT access through the ADMIN namespace", async () => {
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
