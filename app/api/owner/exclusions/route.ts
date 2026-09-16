import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const exclusionSchema = z.object({
  targetType: z.enum(["CANDIDATE", "COMPANY"]),
  targetId: z.string().min(1),
  action: z.enum(["EXCLUDE", "RESTORE"]),
  reason: z.string().trim().min(5, "Le motif d'exclusion/restauration est obligatoire (5 caractères minimum)."),
});

async function requireOwner() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  if (!session?.user?.id || session.user.role !== "OWNER") return null;
  return session.user;
}

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Accès strictement réservé à l'Owner." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const parsed = exclusionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données de requête invalides." }, { status: 400 });
  }

  const { targetType, targetId, action, reason } = parsed.data;
  const newStatus = action === "EXCLUDE" ? "EXCLUDED" : "ACTIVE";

  if (targetType === "CANDIDATE") {
    const candidate = await prisma.candidateProfile.findUnique({
      where: { id: targetId },
      include: { user: true },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidat introuvable." }, { status: 404 });
    }

    const previousStatus = candidate.status;

    await prisma.candidateProfile.update({
      where: { id: targetId },
      data: { status: newStatus },
    });

    await prisma.user.update({
      where: { id: candidate.userId },
      data: { status: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: owner.id!,
        actorRole: "OWNER",
        action: action === "EXCLUDE" ? "EXCLUDE_CANDIDATE" : "RESTORE_CANDIDATE",
        targetType: "CANDIDATE",
        targetId,
        details: {
          candidateUserId: candidate.userId,
          candidateEmail: candidate.user.email,
          previousStatus,
          newStatus,
          reason: reason || null,
        },
      },
    });

    return NextResponse.json({ ok: true, status: newStatus, message: `Candidat ${action === "EXCLUDE" ? "exclu" : "restauré"} avec succès.` });
  } else {
    const company = await prisma.company.findUnique({
      where: { id: targetId },
    });

    if (!company) {
      return NextResponse.json({ error: "Entreprise introuvable." }, { status: 404 });
    }

    const previousStatus = company.status;

    await prisma.company.update({
      where: { id: targetId },
      data: { status: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: owner.id!,
        actorRole: "OWNER",
        action: action === "EXCLUDE" ? "EXCLUDE_COMPANY" : "RESTORE_COMPANY",
        targetType: "COMPANY",
        targetId,
        details: {
          companyName: company.name,
          previousStatus,
          newStatus,
          reason: reason || null,
        },
      },
    });

    return NextResponse.json({ ok: true, status: newStatus, message: `Entreprise ${action === "EXCLUDE" ? "exclue" : "restaurée"} avec succès.` });
  }
}
