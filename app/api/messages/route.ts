import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createMessageSchema = z.object({
  recipientId: z.string().optional(),
  conversationId: z.string().optional(),
  subject: z.string().trim().min(1).max(160).optional(),
  body: z.string().trim().min(1).max(5000),
}).refine((value) => Boolean(value.conversationId || value.recipientId), {
  message: "Destinataire ou conversation requis.",
});

const readSchema = z.object({ conversationId: z.string().min(1) });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const userId = session.user.id;
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    orderBy: { updatedAt: "desc" },
    include: {
      participants: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { id: true, name: true, email: true } } } },
    },
  });

  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Message invalide", issues: parsed.error.issues }, { status: 400 });

  const senderId = session.user.id;
  let conversationId = parsed.data.conversationId;

  if (conversationId) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: senderId } },
    });
    if (!participant) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  } else {
    const recipientId = parsed.data.recipientId!;
    if (recipientId === senderId) return NextResponse.json({ error: "Impossible de s'envoyer un message à soi-même." }, { status: 400 });
    const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
    if (!recipient) return NextResponse.json({ error: "Destinataire introuvable" }, { status: 404 });

    const existing = await prisma.conversation.findFirst({
      where: {
        participants: { every: { userId: { in: [senderId, recipientId] } } },
        AND: [
          { participants: { some: { userId: senderId } } },
          { participants: { some: { userId: recipientId } } },
        ],
      },
      select: { id: true },
    });
    conversationId = existing?.id;

    if (!conversationId) {
      const conversation = await prisma.conversation.create({
        data: {
          subject: parsed.data.subject || "Nouvelle conversation",
          participants: { create: [{ userId: senderId }, { userId: recipientId }] },
        },
      });
      conversationId = conversation.id;
    }
  }

  const message = await prisma.message.create({
    data: { conversationId, senderId, body: parsed.data.body },
    include: { sender: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ message }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 }); }
  const parsed = readSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Conversation invalide" }, { status: 400 });

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: parsed.data.conversationId, userId: session.user.id } },
  });
  if (!participant) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  await prisma.message.updateMany({
    where: { conversationId: parsed.data.conversationId, senderId: { not: session.user.id }, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
