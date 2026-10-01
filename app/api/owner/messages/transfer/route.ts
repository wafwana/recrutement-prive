import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const transferSchema = z.object({
  targetType: z.enum(["CONVERSATION", "MESSAGE", "DOCUMENT", "ARCHIVE_FOLDER", "CANDIDATE_DOCUMENT"]),
  targetId: z.string().trim().min(1),
  collaboratorUserId: z.string().trim().min(1),
  scope: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const revokeSchema = z.object({
  transferId: z.string().trim().min(1),
});

export async function GET(request: Request) {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const role = session.user.role;
  const userId = session.user.id;

  if (role === "OWNER") {
    const url = new URL(request.url);
    const collaboratorUserId = url.searchParams.get("collaboratorUserId");
    const targetId = url.searchParams.get("targetId");

    const whereClause: Record<string, unknown> = {};
    if (collaboratorUserId) whereClause.collaboratorUserId = collaboratorUserId;
    if (targetId) whereClause.targetId = targetId;

    const transfers = await prisma.internalTransfer.findMany({
      where: whereClause,
      include: {
        collaborator: { select: { id: true, name: true, email: true, role: true } },
        grantedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ transfers });
  }

  // Collaborator: return active transfers granted to them
  const transfers = await prisma.internalTransfer.findMany({
    where: { collaboratorUserId: userId, status: "ACTIVE" },
    include: {
      grantedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ transfers });
}

export async function POST(request: Request) {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Le transfert interne est exclusivement réservé à l'OWNER." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 }); }

  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres de transfert invalides", issues: parsed.error.issues }, { status: 400 });
  }

  const { targetType, targetId, collaboratorUserId, scope, notes } = parsed.data;

  // Verify target collaborator exists and is staff
  const collaborator = await prisma.user.findUnique({
    where: { id: collaboratorUserId },
    select: { id: true, role: true, email: true },
  });

  if (!collaborator || (collaborator.role !== "ADMIN" && collaborator.role !== "CONSULTANT")) {
    return NextResponse.json({ error: "Collaborateur introuvable ou rôle non éligible." }, { status: 404 });
  }

  // Handle CONVERSATION transfer: add collaborator to conversation participants if not already present
  if (targetType === "CONVERSATION") {
    const conversation = await prisma.conversation.findUnique({ where: { id: targetId } });
    if (!conversation) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: targetId, userId: collaboratorUserId } },
      create: { conversationId: targetId, userId: collaboratorUserId },
      update: {},
    });
  }

  const transfer = await prisma.internalTransfer.create({
    data: {
      targetType,
      targetId,
      collaboratorUserId,
      scope: scope || targetType,
      status: "ACTIVE",
      grantedByUserId: session.user.id,
      notes,
    },
    include: {
      collaborator: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: "OWNER",
      action: "INTERNAL_TRANSFER_CREATED",
      targetType,
      targetId,
      details: {
        collaboratorUserId,
        collaboratorEmail: collaborator.email,
        transferId: transfer.id,
        scope: transfer.scope,
      },
    },
  });

  return NextResponse.json({ transfer }, { status: 201 });
}

export async function PATCH(request: Request) {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (session.user.role !== "OWNER") {
    return NextResponse.json({ error: "La révocation des transferts est réservée à l'OWNER." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 }); }

  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Identifiant de transfert requis", issues: parsed.error.issues }, { status: 400 });
  }

  const transfer = await prisma.internalTransfer.findUnique({
    where: { id: parsed.data.transferId },
  });

  if (!transfer) {
    return NextResponse.json({ error: "Transfert introuvable." }, { status: 404 });
  }

  const updatedTransfer = await prisma.internalTransfer.update({
    where: { id: transfer.id },
    data: { status: "REVOKED", revokedAt: new Date() },
    include: { collaborator: { select: { id: true, name: true, email: true, role: true } } },
  });

  // If targetType was CONVERSATION, remove collaborator participant unless they have other active transfers for this conversation
  if (transfer.targetType === "CONVERSATION") {
    const activeCount = await prisma.internalTransfer.count({
      where: {
        targetType: "CONVERSATION",
        targetId: transfer.targetId,
        collaboratorUserId: transfer.collaboratorUserId,
        status: "ACTIVE",
      },
    });

    if (activeCount === 0) {
      await prisma.conversationParticipant.deleteMany({
        where: {
          conversationId: transfer.targetId,
          userId: transfer.collaboratorUserId,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: "OWNER",
      action: "INTERNAL_TRANSFER_REVOKED",
      targetType: transfer.targetType,
      targetId: transfer.targetId,
      details: {
        collaboratorUserId: transfer.collaboratorUserId,
        transferId: transfer.id,
        revokedAt: updatedTransfer.revokedAt,
      },
    },
  });

  return NextResponse.json({ transfer: updatedTransfer });
}
