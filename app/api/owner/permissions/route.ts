import { NextResponse } from "next/server";
import { auth, getActiveSessionContext, type AuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, type Permission, getUserPermissions } from "@/lib/auth/permissions";
import { z } from "zod";

const schema = z.object({
  userId: z.string().min(1),
  permissions: z.array(z.string()).default([]),
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

  const permissions = parsed.data.permissions.filter((p): p is Permission =>
    (PERMISSIONS as readonly string[]).includes(p),
  );

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true, name: true, email: true },
  });
  if (!target || !["ADMIN", "CONSULTANT"].includes(target.role)) {
    return NextResponse.json({ error: "ADMIN/CONSULTANT introuvable." }, { status: 404 });
  }

  const record = await prisma.systemSetting.upsert({
    where: { key: `permissions:${target.id}` },
    update: { value: permissions },
    create: { key: `permissions:${target.id}`, value: permissions },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: ownerId,
      actorRole: "OWNER",
      action: "UPDATE_STAFF_PERMISSIONS",
      targetType: "USER",
      targetId: target.id,
      details: { permissions },
    },
  });

  return NextResponse.json({ userId: target.id, permissions: record.value });
}
