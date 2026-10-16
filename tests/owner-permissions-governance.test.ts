import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { runWithTestSession } from "../auth";
import { PUT as updateOwnerPermissions } from "../app/api/owner/permissions/route";

function permissionRequest(body: unknown) {
  return new Request("http://localhost/api/owner/permissions", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("ADMIN cannot modify delegated permissions, even with a valid payload", async () => {
  const response = await runWithTestSession(
    { user: { id: "permission-test-admin-denied", role: "ADMIN" } },
    () => updateOwnerPermissions(permissionRequest({
      userId: "some-admin",
      permissions: ["METIERS_DOSSIERS"],
      reason: "Test de refus ADMIN",
    })),
  );
  assert.equal(response.status, 403);
});

test("OWNER permission updates reject missing reasons and non-canonical permission codes", async () => {
  const ownerSession = { user: { id: "permission-test-owner-validation", role: "OWNER" } };
  const missingReason = await runWithTestSession(ownerSession, () =>
    updateOwnerPermissions(permissionRequest({ userId: "not-reached", permissions: ["METIERS_DOSSIERS"] })),
  );
  assert.equal(missingReason.status, 400);

  const unknownPermission = await runWithTestSession(ownerSession, () =>
    updateOwnerPermissions(permissionRequest({
      userId: "not-reached",
      permissions: ["OWNER"],
      reason: "Vérifier le rejet d'une permission inconnue",
    })),
  );
  assert.equal(unknownPermission.status, 400);
});

test("OWNER permission changes persist and audit the before/after values and required reason", async () => {
  if (!process.env.DATABASE_URL) return;

  const suffix = randomUUID();
  const owner = await prisma.user.create({
    data: {
      name: "Permission Audit Owner",
      email: `permission-owner-${suffix}@example.test`,
      passwordHash: "test-only-hash",
      role: "OWNER",
      status: "ACTIVE",
    },
  });
  const staff = await prisma.user.create({
    data: {
      name: "Permission Audit Admin",
      email: `permission-admin-${suffix}@example.test`,
      passwordHash: "test-only-hash",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  const key = `permissions:${staff.id}`;
  const reason = "Accès métiers et dossiers validé par l'Owner";

  try {
    await prisma.systemSetting.create({
      data: { key, value: ["CANDIDATES_VIEW"] },
    });

    const response = await runWithTestSession(
      { user: { id: owner.id, role: "OWNER" } },
      () => updateOwnerPermissions(permissionRequest({
        userId: staff.id,
        permissions: ["METIERS_DOSSIERS", "CV_LIBRARY", "METIERS_DOSSIERS"],
        reason,
      })),
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload.permissions, ["METIERS_DOSSIERS", "CV_LIBRARY"]);
    assert.deepEqual(payload.previousPermissions, ["CANDIDATES_VIEW"]);
    assert.equal(payload.audited, true);

    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    assert.deepEqual(setting?.value, ["METIERS_DOSSIERS", "CV_LIBRARY"]);

    const audit = await prisma.auditLog.findFirst({
      where: {
        actorUserId: owner.id,
        actorRole: "OWNER",
        action: "UPDATE_STAFF_PERMISSIONS",
        targetId: staff.id,
      },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(audit, "Permission change must write an audit entry");
    const details = audit.details as unknown as Record<string, unknown>;
    assert.deepEqual(details.previousPermissions, ["CANDIDATES_VIEW"]);
    assert.deepEqual(details.permissions, ["METIERS_DOSSIERS", "CV_LIBRARY"]);
    assert.equal(details.reason, reason);
    assert.equal(details.targetRole, "ADMIN");
    assert.equal(details.targetEmail, staff.email);
  } finally {
    await prisma.auditLog.deleteMany({
      where: { action: "UPDATE_STAFF_PERMISSIONS", targetId: staff.id },
    });
    await prisma.systemSetting.deleteMany({ where: { key } });
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, staff.id] } } });
  }
});
