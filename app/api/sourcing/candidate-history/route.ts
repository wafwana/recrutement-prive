import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

async function requireSourcingStaff() {
  let session = getActiveSessionContext();
  if (!session) {
    try {
      session = await auth();
    } catch {
      // Outside a Next.js request scope, fail closed.
    }
  }

  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  // The current Prisma role enum has OWNER, ADMIN and CONSULTANT; staff access
  // is represented by an explicit SOURCING permission for non-OWNER accounts.
  if (!userId || !role || !["OWNER", "ADMIN", "CONSULTANT"].includes(role)) return null;
  if (role !== "OWNER" && !(await hasPermission(userId, role, "SOURCING"))) return null;

  return { userId, role };
}

export async function GET(request: Request) {
  const staff = await requireSourcingStaff();
  if (!staff) {
    return NextResponse.json({ error: "Permission de sourcing non accordée." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get("candidateId")?.trim();
  if (!candidateId) {
    return NextResponse.json({ error: "candidateId est requis." }, { status: 400 });
  }

  try {
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
  } catch {
    return NextResponse.json({ error: "Historique temporairement indisponible." }, { status: 500 });
  }
}
