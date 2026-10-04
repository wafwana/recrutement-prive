import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ presentationId: z.string().trim().min(1) });

function aliasFor(kind: "candidate" | "company", presentationId: string) {
  const compact = presentationId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return kind === "candidate" ? `Candidat #${compact}` : `Entreprise #${compact}`;
}

async function resolveCompanyUserId(companyId: string, sessionUserId: string) {
  const member = await prisma.companyMember.findFirst({
    where: { companyId, userId: sessionUserId },
    select: { userId: true },
  });
  return member?.userId ?? null;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Présentation invalide" }, { status: 400 });

  const presentation = await prisma.missionPresentation.findUnique({
    where: { id: parsed.data.presentationId },
    include: {
      candidate: { select: { id: true, userId: true } },
      company: { select: { id: true } },
    },
  });
  if (!presentation) return NextResponse.json({ error: "Présentation introuvable" }, { status: 404 });

  if (!presentation.anonymousMessagingEnabled) {
    return NextResponse.json({ error: "La messagerie anonymisée n'est pas encore activée par le chasseur de tête." }, { status: 403 });
  }

  if (["IDENTITE_DEBLOQUEE", "MISSION_TERMINEE"].includes(presentation.state)) {
    return NextResponse.json({ error: "Cette présentation n'est plus en mode anonyme." }, { status: 409 });
  }

  const candidateUserId = presentation.candidate.userId;
  const companyUserId = await resolveCompanyUserId(presentation.company.id, session.user.id);
  const isCandidate = session.user.id === candidateUserId;
  const isCompanyMember = Boolean(companyUserId);
  const isStaff = session.user.role === "OWNER" || session.user.role === "ADMIN" || session.user.role === "CONSULTANT";

  if (!isCandidate && !isCompanyMember && !isStaff) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let effectiveCompanyUserId = presentation.companyUserId;
  if (!effectiveCompanyUserId && isCompanyMember) effectiveCompanyUserId = companyUserId;
  if (!effectiveCompanyUserId) {
    return NextResponse.json({ error: "Utilisateur entreprise non associé à cette présentation." }, { status: 409 });
  }

  const existing = await prisma.conversation.findFirst({
    where: { presentationId: presentation.id, mode: "TRUST_ANONYMOUS", status: "ACTIVE" },
    include: { participants: { select: { userId: true } } },
  });

  if (existing) {
    return NextResponse.json({
      conversationId: existing.id,
      aliases: { candidate: presentation.candidateAlias, company: presentation.companyAlias },
    });
  }

  const candidateAlias = presentation.candidateAlias || aliasFor("candidate", presentation.id);
  const companyAlias = presentation.companyAlias || aliasFor("company", presentation.id);

  const conversation = await prisma.conversation.create({
    data: {
      presentationId: presentation.id,
      mode: "TRUST_ANONYMOUS",
      status: "ACTIVE",
      subject: "Mise en relation confidentielle",
      participants: { create: [{ userId: candidateUserId }, { userId: effectiveCompanyUserId }] },
    },
  });

  await prisma.missionPresentation.update({
    where: { id: presentation.id },
    data: {
      candidateAlias,
      companyAlias,
      candidateUserId,
      companyUserId: effectiveCompanyUserId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role || "CANDIDAT",
      action: "TRUST_ANONYMOUS_CONVERSATION_CREATED",
      targetType: "MISSION_PRESENTATION",
      targetId: presentation.id,
      details: { conversationId: conversation.id, mode: "TRUST_ANONYMOUS" },
    },
  });

  return NextResponse.json({
    conversationId: conversation.id,
    aliases: { candidate: candidateAlias, company: companyAlias },
  }, { status: 201 });
}
