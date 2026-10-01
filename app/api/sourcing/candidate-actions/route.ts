import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

async function requireStaffPermission() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  if (!userId || !role || !["OWNER", "ADMIN", "CONSULTANT"].includes(role)) return null;
  if (!(await hasPermission(userId, role, "SOURCING"))) return null;
  return { userId, role };
}

export async function POST(request: Request) {
  const staff = await requireStaffPermission();
  if (!staff) {
    return NextResponse.json({ error: "Permission de sourcing non accordée." }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const candidateId = typeof body.candidateId === "string" ? body.candidateId : undefined;
  const action = typeof body.action === "string" ? body.action : undefined;
  const notes = typeof body.notes === "string" ? body.notes : undefined;

  if (!candidateId || !action) {
    return NextResponse.json({ error: "candidateId et action sont requis." }, { status: 400 });
  }

  const candidate = await prisma.sourcedCandidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Candidat introuvable." }, { status: 404 });
  }

  let newStatus: "VALIDATED" | "REJECTED" | "DETECTED" | "REVIEWING" | "MATCHED" | "CONTACTED" = candidate.status;

  if (action === "VALIDATE") newStatus = "VALIDATED";
  else if (action === "REJECT") newStatus = "REJECTED";
  else if (action === "ARCHIVE") newStatus = "REJECTED";
  else if (action === "REVIEW") newStatus = "REVIEWING";
  else if (action === "RESET") newStatus = "DETECTED";

  const updatedCandidate = await prisma.sourcedCandidate.update({
    where: { id: candidateId },
    data: {
      status: newStatus,
      notes: notes ? `${candidate.notes ? candidate.notes + " | " : ""}${notes}` : candidate.notes,
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: staff.userId,
      actorRole: staff.role,
      action: `SOURCED_CANDIDATE_${action}`,
      targetType: "SOURCED_CANDIDATE",
      targetId: candidateId,
      details: {
        previousStatus: candidate.status,
        newStatus,
        notes,
      },
    },
  });

  return NextResponse.json({ ok: true, candidate: updatedCandidate });
}
