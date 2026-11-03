import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

async function requireStaffPermission() {
  let session = getActiveSessionContext();
  if (!session) {
    try {
      session = await auth();
    } catch {
      // test context or outside Next.js request scope
    }
  }
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  if (!userId || !role || !["OWNER", "ADMIN", "CONSULTANT"].includes(role)) return null;

  if (role !== "OWNER") {
    const allowed = await hasPermission(userId, role, "SOURCING");
    if (!allowed) return null;
  }

  return { userId, role };
}

export async function GET(request: Request) {
  const staff = await requireStaffPermission();
  if (!staff) {
    return NextResponse.json({ error: "Permission de sourcing non accordée." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get("candidateId");

  if (!candidateId) {
    return NextResponse.json({ error: "candidateId est requis." }, { status: 400 });
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      targetType: "SOURCED_CANDIDATE",
      targetId: candidateId,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      actorUserId: true,
      actorRole: true,
      action: true,
      details: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, logs });
}
