import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: RouteParams) {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : null;
  const role = typeof session?.user?.role === "string" ? session.user.role : null;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }
  if (!(await hasPermission(userId, role || undefined, "SOURCING")) ||
      !(await hasPermission(userId, role || undefined, "METIERS_DOSSIERS"))) {
    return NextResponse.json({ error: "Permission insuffisante." }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.proactiveSearch.findFirst({
    where: role === "OWNER" ? { id } : { id, createdByUserId: userId },
    select: { id: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: "Recherche introuvable." }, { status: 404 });
  if (existing.status === "RUNNING") return NextResponse.json({ error: "Impossible d'archiver une recherche en cours." }, { status: 409 });

  const search = await prisma.proactiveSearch.update({
    where: { id },
    data: { status: "ARCHIVED" },
    select: { id: true, status: true },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      actorRole: role || "STAFF",
      action: "ARCHIVE_PROACTIVE_CANDIDATE_SEARCH",
      targetType: "PROACTIVE_SEARCH",
      targetId: search.id,
      details: { previousStatus: existing.status, status: search.status },
    },
  });
  return NextResponse.json({ ok: true, search });
}
