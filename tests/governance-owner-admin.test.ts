import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { runWithTestSession } from "../auth";
import { GET, POST, PATCH } from "../app/api/owner/admins/route";
import { hashPassword } from "../lib/password-crypto";

test("OWNER/ADMIN governance: only OWNER can manage delegated staff, OWNER cannot be altered", async () => {
  if (!process.env.DATABASE_URL) return;

  const suffix = Date.now().toString();
  const passwordHash = await hashPassword("Governance-2026!");
  const owner = await prisma.user.create({
    data: { name: "Governance Owner", email: `owner.${suffix}@example.test`, passwordHash, role: "OWNER", status: "ACTIVE" },
  });
  const admin = await prisma.user.create({
    data: { name: "Governance Admin", email: `admin.${suffix}@example.test`, passwordHash, role: "ADMIN", status: "ACTIVE" },
  });

  const ownerSession = { user: { id: owner.id, role: "OWNER" } };
  const adminSession = { user: { id: admin.id, role: "ADMIN" } };

  try {
    const adminGet = await runWithTestSession(adminSession, () => GET());
    assert.equal(adminGet.status, 403);

    const ownerGet = await runWithTestSession(ownerSession, () => GET());
    assert.equal(ownerGet.status, 200);

    const createReq = (role: "ADMIN" | "CONSULTANT") =>
      new Request("http://localhost/api/owner/admins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `Delegated ${role}`,
          email: `${role.toLowerCase()}.${suffix}@example.test`,
          password: "Delegated-2026!",
          role,
        }),
      });

    const adminPost = await runWithTestSession(adminSession, () => POST(createReq("ADMIN")));
    assert.equal(adminPost.status, 403);

    const ownerPost = await runWithTestSession(ownerSession, () => POST(createReq("ADMIN")));
    assert.equal(ownerPost.status, 201);
    const createdAdmin = await ownerPost.json();
    assert.equal(createdAdmin.user.role, "ADMIN");

    const consultantPost = await runWithTestSession(ownerSession, () => POST(createReq("CONSULTANT")));
    assert.equal(consultantPost.status, 201);
    const createdConsultant = await consultantPost.json();

    const ownerPatchRequest = new Request("http://localhost/api/owner/admins", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: owner.id, action: "SUSPEND", reason: "Attempt owner mutation" }),
    });
    const ownerPatch = await runWithTestSession(ownerSession, () => PATCH(ownerPatchRequest));
    assert.equal(ownerPatch.status, 403);

    const adminPatchRequest = new Request("http://localhost/api/owner/admins", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: admin.id, action: "REVOKE", reason: "Governance test" }),
    });
    const adminPatch = await runWithTestSession(adminSession, () => PATCH(adminPatchRequest));
    assert.equal(adminPatch.status, 403);

    const revokeRequest = new Request("http://localhost/api/owner/admins", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: createdAdmin.user.id, action: "REVOKE", reason: "Governance test" }),
    });
    const revokeResponse = await runWithTestSession(ownerSession, () => PATCH(revokeRequest));
    assert.equal(revokeResponse.status, 200);
    const revoked = await revokeResponse.json();
    assert.equal(revoked.user.role, "CANDIDAT");
    assert.equal(revoked.user.status, "EXCLUDED");

    const auditEntries = await prisma.auditLog.findMany({
      where: { actorUserId: owner.id, targetId: { in: [createdAdmin.user.id, createdConsultant.user.id] } },
      orderBy: { createdAt: "asc" },
    });
    assert.ok(auditEntries.some((entry) => entry.action === "CREATE_ADMIN"));
    assert.ok(auditEntries.some((entry) => entry.action === "CREATE_CONSULTANT"));
    assert.ok(auditEntries.some((entry) => entry.action === "REVOKE_ADMIN"));
  } finally {
    await prisma.auditLog.deleteMany({ where: { actorUserId: owner.id } });
    await prisma.user.deleteMany({ where: { id: { in: [admin.id, owner.id] } } });
    await prisma.user.deleteMany({ where: { email: { in: [`admin.${suffix}@example.test`, `consultant.${suffix}@example.test`] } } });
  }
});
