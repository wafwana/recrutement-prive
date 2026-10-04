import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/permissions";
import { moderateAnonymousMessage } from "@/lib/messaging/anonymous-moderation";

const createMessageSchema = z.object({
  recipientId: z.string().trim().min(1).optional(),
  conversationId: z.string().trim().min(1).optional(),
  subject: z.string().trim().min(1).max(160).optional(),
  body: z.string().trim().min(1).max(5000),
}).refine((value) => Boolean(value.conversationId || value.recipientId), {
  message: "Destinataire ou conversation requis.",
});

const readSchema = z.object({ conversationId: z.string().trim().min(1) });

async function getTrustAnonymousConversation(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      presentation: { select: { id: true, state: true, candidateAlias: true, companyAlias: true, candidateUserId: true, companyUserId: true } },
      participants: { select: { userId: true, user: { select: { role: true } } } },
    },
  });
}

async function isDirectCandidateCompanyConversation(conversationId: string) {
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    include: { user: { select: { role: true } } },
  });
  const roles = new Set(participants.map((participant) => participant.user.role));
  return roles.has("CANDIDAT") && roles.has("ENTREPRISE") && participants.length === 2;
}

async function assertStaffMessagingPermission(userId: string, role: string | undefined) {
  if (role === "ADMIN" || role === "CONSULTANT") {
    return hasPermission(userId, role, "MESSAGING_CLIENTS_ENTERPRISE");
  }
  return true;
}

async function assertStaffConversationScope(userId: string, role: string | undefined, recipientId?: string, conversationId?: string) {
  if (role !== "ADMIN" && role !== "CONSULTANT") return;
  const allowed = await assertStaffMessagingPermission(userId, role);
  if (!allowed) throw new Error("Permission requise : messagerie clients / entreprises.");
  if (conversationId) {
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      include: { user: { select: { role: true } } },
    });
    if (participants.some((p) => p.user.role !== "ENTREPRISE" && p.user.role !== "ADMIN" && p.user.role !== "CONSULTANT" && p.user.role !== "OWNER")) {
      throw new Error("Cette conversation n'est pas dans le périmètre clients / entreprises.");
    }
  }
  if (recipientId) {
    const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { role: true } });
    if (!recipient || recipient.role !== "ENTREPRISE") throw new Error("La messagerie staff est limitée aux entreprises clientes.");
  }
}

async function assertNoDirectCandidateCompanyContact(userId: string, recipientId?: string, conversationId?: string) {
  if (conversationId && await isDirectCandidateCompanyConversation(conversationId)) {
    throw new Error("Le contact direct candidat-entreprise est interdit");
  }

  if (!recipientId || recipientId === userId) return;
  const users = await prisma.user.findMany({
    where: { id: { in: [userId, recipientId] } },
    select: { id: true, role: true },
  });
  const roles = new Set(users.map((user) => user.role));
  if (roles.has("CANDIDAT") && roles.has("ENTREPRISE")) {
    throw new Error("Le contact direct candidat-entreprise est interdit");
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const userId = session.user.id;
  const userRole = session.user.role || undefined;
  const conversationId = new URL(request.url).searchParams.get("conversationId");

  try {
    await assertStaffConversationScope(userId, userRole, undefined, conversationId ?? undefined);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Accès refusé" }, { status: 403 });
  }

  if (conversationId) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    if (await isDirectCandidateCompanyConversation(conversationId)) {
      return NextResponse.json({ error: "Le contact direct candidat-entreprise est interdit" }, { status: 403 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!conversation) return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });

    if (conversation.mode === "TRUST_ANONYMOUS") {
      const trust = await getTrustAnonymousConversation(conversationId);
      if (!trust?.presentation) return NextResponse.json({ error: "Canal de confiance invalide" }, { status: 409 });
      const p = trust.presentation;
      const anonymousMessages = conversation.messages.map((message) => ({
        id: message.id,
        body: message.body,
        moderationStatus: message.moderationStatus,
        createdAt: message.createdAt,
        readAt: message.readAt,
        senderAlias: message.senderId === p.candidateUserId ? p.candidateAlias : p.companyAlias,
      }));
      return NextResponse.json({
        conversation: {
          id: conversation.id,
          subject: conversation.subject,
          mode: conversation.mode,
          status: conversation.status,
          presentationId: p.id,
          aliases: { candidate: p.candidateAlias, company: p.companyAlias },
          messages: anonymousMessages,
        },
      });
    }

    return NextResponse.json({ conversation });
  }

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    orderBy: { updatedAt: "desc" },
    include: {
      participants: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { id: true, name: true, email: true } } } },
    },
  });

  const visibleConversations = conversations
    .filter((conversation) => {
      const roles = new Set(conversation.participants.map((participant) => participant.user.role));
      const directCandidateCompany = roles.has("CANDIDAT") && roles.has("ENTREPRISE") && conversation.participants.length === 2;
      return conversation.mode === "TRUST_ANONYMOUS" || !directCandidateCompany;
    })
    .map((conversation) => {
      if (conversation.mode !== "TRUST_ANONYMOUS") return conversation;
      return {
        id: conversation.id,
        subject: conversation.subject,
        mode: conversation.mode,
        status: conversation.status,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages.map((message) => ({
          id: message.id,
          body: message.body,
          moderationStatus: message.moderationStatus,
          createdAt: message.createdAt,
          readAt: message.readAt,
        })),
      };
    });

  return NextResponse.json({ conversations: visibleConversations });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 }); }
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Message invalide", issues: parsed.error.issues }, { status: 400 });

  const senderId = session.user.id;
  const senderRole = session.user.role || undefined;
  try {
    await assertStaffConversationScope(senderId, senderRole, parsed.data.recipientId, parsed.data.conversationId ?? undefined);
    await assertNoDirectCandidateCompanyContact(senderId, parsed.data.recipientId, parsed.data.conversationId ?? undefined);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Contact interdit" }, { status: 403 });
  }

  let conversationId = parsed.data.conversationId;

  if (conversationId) {
    const trust = await getTrustAnonymousConversation(conversationId);
    if (trust?.mode === "TRUST_ANONYMOUS") {
      if (!trust.presentation || trust.presentation.state === "IDENTITE_DEBLOQUEE" || trust.presentation.state === "MISSION_TERMINEE") {
        return NextResponse.json({ error: "Canal anonyme fermé." }, { status: 409 });
      }
      const participantIds = new Set(trust.participants.map((p) => p.userId));
      if (!participantIds.has(senderId) || trust.participants.length !== 2) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
      const moderation = moderateAnonymousMessage(parsed.data.body);
      if (!moderation.allowed) {
        await prisma.auditLog.create({
          data: {
            actorUserId: senderId,
            actorRole: senderRole || "CANDIDAT",
            action: "TRUST_ANONYMOUS_MESSAGE_BLOCKED",
            targetType: "CONVERSATION",
            targetId: conversationId,
            details: { categories: moderation.categories, reason: moderation.reason },
          },
        });
        return NextResponse.json({
          error: "Message bloqué : les coordonnées, liens externes et identifiants sociaux ne sont pas autorisés dans ce canal.",
          categories: moderation.categories,
        }, { status: 422 });
      }
    }
  }

  if (conversationId) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: senderId } },
    });
    if (!participant) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  } else {
    let effectiveRecipientId = parsed.data.recipientId!;

    // Requirement B: External messages/documents from ENTREPRISE or SPONSOR must arrive in the OWNER inbox first.
    if (senderRole === "ENTREPRISE" || senderRole === "SPONSOR") {
      const ownerUser = await prisma.user.findFirst({
        where: { role: "OWNER", status: "ACTIVE" },
        select: { id: true },
      });
      if (ownerUser) {
        effectiveRecipientId = ownerUser.id;
      }
    }

    if (effectiveRecipientId === senderId) return NextResponse.json({ error: "Impossible de s'envoyer un message à soi-même." }, { status: 400 });
    const recipient = await prisma.user.findUnique({ where: { id: effectiveRecipientId }, select: { id: true } });
    if (!recipient) return NextResponse.json({ error: "Destinataire introuvable" }, { status: 404 });

    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { every: { userId: { in: [senderId, effectiveRecipientId] } } } },
          { participants: { some: { userId: senderId } } },
          { participants: { some: { userId: effectiveRecipientId } } },
        ],
      },
      select: { id: true },
    });
    conversationId = existing?.id;

    if (!conversationId) {
      const conversation = await prisma.conversation.create({
        data: {
          subject: parsed.data.subject || "Nouvelle conversation",
          participants: { create: [{ userId: senderId }, { userId: effectiveRecipientId }] },
        },
      });
      conversationId = conversation.id;
    }
  }

  const trust = await getTrustAnonymousConversation(conversationId);
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      body: parsed.data.body,
      moderationStatus: trust?.mode === "TRUST_ANONYMOUS" ? "ALLOWED" : "NOT_APPLICABLE",
      metadataSanitized: trust?.mode === "TRUST_ANONYMOUS",
    },
    include: { sender: { select: { id: true, name: true, email: true } } },
  });

  if (trust?.mode === "TRUST_ANONYMOUS" && trust.presentation) {
    const p = trust.presentation;
    return NextResponse.json({
      message: {
        id: message.id,
        body: message.body,
        moderationStatus: message.moderationStatus,
        createdAt: message.createdAt,
        senderAlias: senderId === p.candidateUserId ? p.candidateAlias : p.companyAlias,
      },
    }, { status: 201 });
  }

  return NextResponse.json({ message }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 }); }
  const parsed = readSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Conversation invalide", issues: parsed.error.issues }, { status: 400 });

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: parsed.data.conversationId, userId: session.user.id } },
  });
  if (!participant) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  if (await isDirectCandidateCompanyConversation(parsed.data.conversationId)) {
    return NextResponse.json({ error: "Le contact direct candidat-entreprise est interdit" }, { status: 403 });
  }

  await prisma.message.updateMany({
    where: { conversationId: parsed.data.conversationId, senderId: { not: session.user.id }, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
