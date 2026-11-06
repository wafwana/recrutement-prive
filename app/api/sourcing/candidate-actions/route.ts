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

  const statusByAction: Record<string, "VALIDATED" | "REJECTED" | "DETECTED" | "REVIEWING"> = {
    VALIDATE: "VALIDATED", REJECT: "REJECTED", ARCHIVE: "REJECTED", REVIEW: "REVIEWING", RESET: "DETECTED",
  };
  if (!Object.prototype.hasOwnProperty.call(statusByAction, action)) {
    return NextResponse.json({ error: "Action de sourcing invalide." }, { status: 400 });
  }
  const newStatus = statusByAction[action];
  // La lecture, la mise à jour du statut et l’AuditLog sont atomiques.
  let updatedCandidate: Awaited<ReturnType<typeof prisma.sourcedCandidate.update>> | null = null;
  try {
    updatedCandidate = await prisma.$transaction(async (tx) => {
      const candidate = await tx.sourcedCandidate.findUnique({ where: { id: candidateId } });
      if (!candidate) return null;
      if (candidate.source === "PLATFORM_CV_INTAKE" && candidate.consentStatus !== "AUTHORIZED") throw new Error("CV_INTAKE_CONSENT_REQUIRED");
      const updated = await tx.sourcedCandidate.update({
        where: { id: candidateId },
        data: { status: newStatus, notes: notes ? `${candidate.notes ? candidate.notes + " | " : ""}${notes}` : candidate.notes, updatedAt: new Date() },
      });
      await tx.auditLog.create({
        data: { actorUserId: staff.userId, actorRole: staff.role, action: `SOURCED_CANDIDATE_${action}`, targetType: "SOURCED_CANDIDATE", targetId: candidateId, details: { previousStatus: candidate.status, newStatus, notes } },
      });
      return updated;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CV_INTAKE_CONSENT_REQUIRED") return NextResponse.json({ error: "Autorisation d’exploitation non validée. Action de sourcing refusée." }, { status: 409 });
    throw error;
  }
  if (!updatedCandidate) return NextResponse.json({ error: "Candidat introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, candidate: updatedCandidate });
}
