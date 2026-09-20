import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { runWithTestSession } from "../auth";
import { GET, POST, PATCH } from "../app/api/owner/admins/route";
import { hashPassword } from "../lib/password-crypto";
import { hasPermission } from "../lib/auth/permissions";

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
    assert.equal((await runWithTestSession(adminSession, () => GET())).status, 403);
    assert.equal((await runWithTestSession(ownerSession, () => GET())).status, 200);

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

    assert.equal((await runWithTestSession(adminSession, () => POST(createReq("ADMIN")))).status, 403);

    const ownerPost = await runWithTestSession(ownerSession, () => POST(createReq("ADMIN")));
    assert.equal(ownerPost.status, 201);
    const createdAdmin = await ownerPost.json();
    assert.equal(createdAdmin.user.role, "ADMIN");

    const permissionPatch = await runWithTestSession(ownerSession, () =>
      PATCH(new Request("http://localhost/api/owner/admins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: createdAdmin.user.id,
          action: "SET_PERMISSIONS",
          reason: "Delegation ciblée",
          permissions: ["CANDIDATES_VIEW", "DOCUMENTS", "CV_IMPORT"],
        }),
      })),
    );
    assert.equal(permissionPatch.status, 200);
    assert.deepEqual((await permissionPatch.json()).permissions, ["CANDIDATES_VIEW", "DOCUMENTS", "CV_IMPORT"]);
    const storedPermissions = await prisma.systemSetting.findUnique({ where: { key: `permissions:${createdAdmin.user.id}` } });
    assert.deepEqual(storedPermissions?.value, ["CANDIDATES_VIEW", "DOCUMENTS", "CV_IMPORT"]);\n    assert.equal(await hasPermission(createdAdmin.user.id, "ADMIN", "DOCUMENTS_UPLOAD"), true);\n    assert.equal(await hasPermission(createdAdmin.user.id, "ADMIN", "DOCUMENTS_ANALYZE"), true);\n    assert.equal(await hasPermission(createdAdmin.user.id, "ADMIN", "DOCUMENTS_ARCHIVE"), true);

    const consultantPost = await runWithTestSession(ownerSession, () => POST(createReq("CONSULTANT")));
    assert.equal(consultantPost.status, 201);
    const createdConsultant = await consultantPost.json();

    const ownerPatch = await runWithTestSession(ownerSession, () =>
      PATCH(new Request("http://localhost/api/owner/admins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: owner.id, action: "SUSPEND", reason: "Attempt owner mutation" }),
      })),
    );
    assert.equal(ownerPatch.status, 403);

    const adminPatch = await runWithTestSession(adminSession, () =>
      PATCH(new Request("http://localhost/api/owner/admins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: admin.id, action: "REVOKE", reason: "Governance test" }),
      })),
    );
    assert.equal(adminPatch.status, 403);

    const suspend = await runWithTestSession(ownerSession, () =>
      PATCH(new Request("http://localhost/api/owner/admins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: createdAdmin.user.id, action: "SUSPEND", reason: "Temporary suspension test" }),
      })),
    );
    assert.equal(suspend.status, 200);
    assert.equal((await suspend.json()).user.status, "SUSPENDED");

    const reactivate = await runWithTestSession(ownerSession, () =>
      PATCH(new Request("http://localhost/api/owner/admins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: createdAdmin.user.id, action: "REACTIVATE", reason: "Reactivation test" }),
      })),
    );
    assert.equal(reactivate.status, 200);
    assert.equal((await reactivate.json()).user.status, "ACTIVE");

    const revoke = await runWithTestSession(ownerSession, () =>
      PATCH(new Request("http://localhost/api/owner/admins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: createdAdmin.user.id, action: "REVOKE", reason: "Governance test" }),
      })),
    );
    assert.equal(revoke.status, 200);
    const revoked = await revoke.json();
    assert.equal(revoked.user.role, "CANDIDAT");
    assert.equal(revoked.user.status, "EXCLUDED");

    const auditEntries = await prisma.auditLog.findMany({
      where: { actorUserId: owner.id, targetId: { in: [createdAdmin.user.id, createdConsultant.user.id] } },
      orderBy: { createdAt: "asc" },
    });
    assert.ok(auditEntries.some((entry) => entry.action === "CREATE_ADMIN"));
    assert.ok(auditEntries.some((entry) => entry.action === "CREATE_CONSULTANT"));
    assert.ok(auditEntries.some((entry) => entry.action === "SUSPEND_ADMIN"));
    assert.ok(auditEntries.some((entry) => entry.action === "REACTIVATE_ADMIN"));
    assert.ok(auditEntries.some((entry) => entry.action === "REVOKE_ADMIN"));
  } finally {
    await prisma.systemSetting.deleteMany({ where: { key: { in: [`permissions:${admin.id}`, `permissions:${owner.id}`] } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: owner.id } });
    await prisma.user.deleteMany({ where: { id: { in: [admin.id, owner.id] } } });
    await prisma.user.deleteMany({ where: { email: { in: [`admin.${suffix}@example.test`, `consultant.${suffix}@example.test`] } } });
  }
});
