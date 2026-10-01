import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/**
 * Checks if a user is permitted to place outbound calls.
 * Rule: OWNER always allowed.
 * ADMIN and CONSULTANT are blocked by default unless explicitly granted by OWNER.
 */
export async function canMakeOutboundCalls(
  userId: string,
  role: Role | string | undefined
): Promise<boolean> {
  if (role === "OWNER") {
    return true;
  }

  if (!userId || !process.env.DATABASE_URL) {
    return false;
  }

  try {
    const perm = await prisma.telephonyPermission.findUnique({
      where: { userId },
    });

    return perm?.canMakeOutboundCalls === true;
  } catch (err) {
    console.error("[canMakeOutboundCalls] Error checking permission:", err);
    return false;
  }
}

/**
 * Sets outbound call permission for a user.
 * OWNER only authority.
 */
export async function setOutboundCallPermission(
  targetUserId: string,
  canCall: boolean,
  grantedByUserId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, error: "Base de données non disponible." };
  }

  try {
    await prisma.telephonyPermission.upsert({
      where: { userId: targetUserId },
      create: {
        userId: targetUserId,
        canMakeOutboundCalls: canCall,
        grantedByUserId,
      },
      update: {
        canMakeOutboundCalls: canCall,
        grantedByUserId,
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: grantedByUserId,
        actorRole: "OWNER",
        action: canCall ? "GRANT_OUTBOUND_CALL_PERMISSION" : "REVOKE_OUTBOUND_CALL_PERMISSION",
        targetType: "USER",
        targetId: targetUserId,
        details: { targetUserId, canCall },
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("[setOutboundCallPermission] Error updating permission:", err);
    return { ok: false, error: "Impossible de modifier la permission téléphonique." };
  }
}

/**
 * Lists all staff users with their current outbound call permission.
 */
export async function listStaffTelephonyPermissions() {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      role: { in: ["OWNER", "ADMIN", "CONSULTANT"] },
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      telephonyPermission: {
        select: {
          canMakeOutboundCalls: true,
          grantedAt: true,
          grantedByUserId: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    canMakeOutboundCalls: u.role === "OWNER" || u.telephonyPermission?.canMakeOutboundCalls === true,
    grantedAt: u.telephonyPermission?.grantedAt ?? null,
  }));
}
