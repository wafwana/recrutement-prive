import { NextResponse } from "next/server";
import { auth, getActiveSessionContext, type AuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, getUserPermissions } from "@/lib/auth/permissions";
import { z } from "zod";

const schema = z.object({
  userId: z.string().min(1),
  permissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length).default([]),
  reason: z.string().trim().min(5, "Le motif de modification des permissions est obligatoire (5 caractères minimum)."),
});

function isOwner(session: AuthSession | null) {
  return Boolean(session?.user?.id && session.user.role === "OWNER");
}

export async function GET() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  if (!isOwner(session)) return NextResponse.json({ error: "Accès réservé à l'Owner." }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "CONSULTANT"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  const result = await Promise.all(users.map(async (user) => {
    const permissions = await getUserPermissions(user.id);
    return { ...user, permissions, configured: permissions !== null };
  }));

  return NextResponse.json({ permissions: PERMISSIONS, users: result });
}

export async function PUT(request: Request) {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  if (!isOwner(session)) return NextResponse.json({ error: "Accès réservé à l'Owner." }, { status: 403 });

  const ownerId = session?.user?.id;
  if (!ownerId) return NextResponse.json({ error: "Session Owner invalide." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  const permissions = [...new Set(parsed.data.permissions)];

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true, name: true, email: true },
  });
  if (!target || !["ADMIN", "CONSULTANT"].includes(target.role)) {
    return NextResponse.json({ error: "ADMIN/CONSULTANT introuvable." }, { status: 404 });
  }

  const key = `permissions:${target.id}`;
  const saved = await prisma.$transaction(async (tx) => {
    const previousRecord = await tx.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    const previousPermissions = Array.isArray(previousRecord?.value)
      ? previousRecord.value.filter((item): item is string => typeof item === "string")
      : [];

    const record = await tx.systemSetting.upsert({
      where: { key },
      update: { value: permissions },
      create: { key, value: permissions },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: ownerId,
        actorRole: "OWNER",
        action: "UPDATE_STAFF_PERMISSIONS",
        targetType: "USER",
        targetId: target.id,
        details: {
          targetRole: target.role,
          targetEmail: target.email,
          permissionsBeforeConfigured: previousRecord !== null,
          previousPermissions,
          permissions,
          reason: parsed.data.reason,
        },
      },
    });

    return { record, previousPermissions };
  });

  return NextResponse.json({
    userId: target.id,
    permissions: saved.record.value,
    previousPermissions: saved.previousPermissions,
    audited: true,
  });
}
