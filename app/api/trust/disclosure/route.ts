import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/permissions";

const requestSchema = z.object({
  presentationId: z.string().trim().min(1),
  reason: z.string().trim().max(1000).optional(),
});

const decisionSchema = z.object({
  requestId: z.string().trim().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande invalide" }, { status: 400 });

  const presentation = await prisma.missionPresentation.findUnique({
    where: { id: parsed.data.presentationId },
    select: {
      id: true, state: true, anonymousMessagingEnabled: true,
      candidateUserId: true, companyUserId: true,
    },
  });
  if (!presentation || !presentation.anonymousMessagingEnabled) return NextResponse.json({ error: "Canal anonyme indisponible" }, { status: 404 });
  if (presentation.state === "IDENTITE_DEBLOQUEE" || presentation.state === "MISSION_TERMINEE") {
    return NextResponse.json({ error: "Identité déjà débloquée ou mission terminée" }, { status: 409 });
  }

  if (![presentation.candidateUserId, presentation.companyUserId].includes(session.user.id)) {
    return NextResponse.json({ error: "Seul un participant peut demander la levée d'anonymat." }, { status: 403 });
  }

  const pending = await prisma.anonymousDisclosureRequest.findFirst({
    where: { presentationId: presentation.id, status: "PENDING" },
    select: { id: true },
  });
  if (pending) return NextResponse.json({ requestId: pending.id, status: "PENDING" });

  const created = await prisma.anonymousDisclosureRequest.create({
    data: {
      presentationId: presentation.id,
      requestedByUserId: session.user.id,
      reason: parsed.data.reason,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role || "CANDIDAT",
      action: "TRUST_IDENTITY_DISCLOSURE_REQUESTED",
      targetType: "MISSION_PRESENTATION",
      targetId: presentation.id,
      details: { requestId: created.id },
    },
  });

  return NextResponse.json({ requestId: created.id, status: created.status }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Décision invalide" }, { status: 400 });

  const allowed = await hasPermission(session.user.id, session.user.role, "PRESENTATIONS_MANAGE");
  if (!allowed) return NextResponse.json({ error: "Permission requise : gestion des présentations." }, { status: 403 });

  const req = await prisma.anonymousDisclosureRequest.findUnique({
    where: { id: parsed.data.requestId },
    select: { id: true, presentationId: true, status: true },
  });
  if (!req) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  if (req.status !== "PENDING") return NextResponse.json({ error: "Demande déjà traitée" }, { status: 409 });

  const nextState = parsed.data.decision === "APPROVE" ? "IDENTITE_DEBLOQUEE" : undefined;
  const now = new Date();

  await prisma.$transaction([
    prisma.anonymousDisclosureRequest.update({
      where: { id: req.id },
      data: { status: parsed.data.decision === "APPROVE" ? "APPROVED" : "REJECTED", decidedByUserId: session.user.id, decidedAt: now },
    }),
    ...(nextState ? [
      prisma.missionPresentation.update({
        where: { id: req.presentationId },
        data: { state: "IDENTITE_DEBLOQUEE", unlockedAt: now, anonymousMessagingEnabled: false },
      }),
      prisma.conversation.updateMany({
        where: { presentationId: req.presentationId, mode: "TRUST_ANONYMOUS", status: "ACTIVE" },
        data: { status: "CLOSED" },
      }),
    ] : []),
    prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        actorRole: session.user.role || "ADMIN",
        action: parsed.data.decision === "APPROVE" ? "TRUST_IDENTITY_DISCLOSURE_APPROVED" : "TRUST_IDENTITY_DISCLOSURE_REJECTED",
        targetType: "MISSION_PRESENTATION",
        targetId: req.presentationId,
        details: { requestId: req.id },
      },
    }),
  ]);

  return NextResponse.json({ requestId: req.id, status: parsed.data.decision === "APPROVE" ? "APPROVED" : "REJECTED", identityUnlocked: Boolean(nextState) });
}
