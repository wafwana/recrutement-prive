import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const SESSION_MINUTES = 45;
const sdpSchema = z.object({
  type: z.enum(["offer", "answer"]),
  sdp: z.string().min(1).max(100_000),
});
const candidateSchema = z.object({
  candidate: z.string().min(1).max(10_000),
  sdpMid: z.string().max(256).nullable().optional(),
  sdpMLineIndex: z.number().int().min(0).max(100).nullable().optional(),
  usernameFragment: z.string().max(256).nullable().optional(),
});
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("offer"), sessionId: z.string().min(1), offer: sdpSchema }),
  z.object({ action: z.literal("answer"), sessionId: z.string().min(1), answer: sdpSchema }),
  z.object({ action: z.literal("candidate"), sessionId: z.string().min(1), candidate: candidateSchema }),
  z.object({ action: z.literal("start"), sessionId: z.string().min(1) }),
  z.object({ action: z.literal("end"), sessionId: z.string().min(1) }),
]);

function iceServers() {
  const urls = (process.env.RP_TURN_URLS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const username = process.env.RP_TURN_USERNAME?.trim();
  const credential = process.env.RP_TURN_CREDENTIAL;
  if (!urls.length || !username || !credential) return null;
  return [{ urls, username, credential }];
}

async function participantForPresentation(presentationId: string, userId: string) {
  return prisma.missionPresentation.findFirst({
    where: {
      id: presentationId,
      anonymousMessagingEnabled: true,
      state: { notIn: ["IDENTITE_DEBLOQUEE", "MISSION_TERMINEE"] },
      OR: [{ candidateUserId: userId }, { companyUserId: userId }],
    },
    select: {
      id: true,
      candidateUserId: true,
      companyUserId: true,
      candidateAlias: true,
      companyAlias: true,
      state: true,
    },
  });
}

async function getSession(sessionId: string, userId: string) {
  const session = await prisma.videoSession.findUnique({
    where: { id: sessionId },
    include: { presentation: { select: { id: true, candidateUserId: true, companyUserId: true, candidateAlias: true, companyAlias: true, state: true, anonymousMessagingEnabled: true } } },
  });
  if (!session) return null;
  const p = session.presentation;
  if (p.candidateUserId !== userId && p.companyUserId !== userId) return null;
  if (!p.anonymousMessagingEnabled || ["IDENTITE_DEBLOQUEE", "MISSION_TERMINEE"].includes(p.state)) return null;
  if (session.expiresAt <= new Date() && session.status !== "ENDED") {
    await prisma.videoSession.update({ where: { id: session.id }, data: { status: "EXPIRED", endedAt: new Date() } });
    return null;
  }
  return session;
}

function publicSession(session: NonNullable<Awaited<ReturnType<typeof getSession>>>, userId: string) {
  if (!session) return null;
  const isA = session.createdByUserId === userId;
  const isCandidate = session.presentation.candidateUserId === userId;
  return {
    id: session.id,
    status: session.status,
    expiresAt: session.expiresAt,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    role: isA ? "INITIATOR" : "PARTICIPANT",
    localAlias: isCandidate ? session.presentation.candidateAlias : session.presentation.companyAlias,
    remoteAlias: isCandidate ? session.presentation.companyAlias : session.presentation.candidateAlias,
    remoteOffer: !isA ? session.offer : null,
    remoteAnswer: isA ? session.answer : null,
    remoteCandidates: isA ? (Array.isArray(session.candidateB) ? session.candidateB : []) : (Array.isArray(session.candidateA) ? session.candidateA : []),
    iceServers: iceServers(),
  };
}

export async function GET(request: Request) {
  const sessionUser = await auth();
  if (!sessionUser?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  if (!iceServers()) return NextResponse.json({ error: "Service vidéo sécurisé non configuré." }, { status: 503 });
  const session = await getSession(sessionId, sessionUser.user.id);
  if (!session) return NextResponse.json({ error: "Session vidéo introuvable ou expirée" }, { status: 404 });
  return NextResponse.json({ session: publicSession(session, sessionUser.user.id) });
}

export async function POST(request: Request) {
  const sessionUser = await auth();
  if (!sessionUser?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = sessionUser.user.id;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 }); }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Action vidéo invalide", issues: parsed.error.issues }, { status: 400 });

  if (!iceServers()) return NextResponse.json({ error: "Service vidéo sécurisé non configuré." }, { status: 503 });

  if (parsed.data.action === "end") {
    const session = await getSession(parsed.data.sessionId, userId);
    if (!session) return NextResponse.json({ error: "Session vidéo introuvable" }, { status: 404 });
    await prisma.videoSession.update({ where: { id: session.id }, data: { status: "ENDED", endedAt: new Date() } });
    await prisma.auditLog.create({
      data: { actorUserId: userId, actorRole: sessionUser.user.role || "CANDIDAT", action: "TRUST_VIDEO_ENDED", targetType: "VIDEO_SESSION", targetId: session.id },
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "offer" || parsed.data.action === "answer" || parsed.data.action === "candidate" || parsed.data.action === "start") {
    const session = parsed.data.action === "start"
      ? await getSession(parsed.data.sessionId, userId)
      : await getSession(parsed.data.sessionId, userId);
    if (!session) return NextResponse.json({ error: "Session vidéo introuvable ou expirée" }, { status: 404 });

    const isA = session.createdByUserId === userId;
    if (parsed.data.action === "offer" && !isA) return NextResponse.json({ error: "Seul l'initiateur peut publier l'offre." }, { status: 403 });
    if (parsed.data.action === "answer" && isA) return NextResponse.json({ error: "Seul le second participant peut publier la réponse." }, { status: 403 });

    if (parsed.data.action === "offer") {
      await prisma.videoSession.update({ where: { id: session.id }, data: { offer: parsed.data.offer, status: "OFFER_READY" } });
    } else if (parsed.data.action === "answer") {
      await prisma.videoSession.update({ where: { id: session.id }, data: { answer: parsed.data.answer, status: "ACTIVE", startedAt: session.startedAt || new Date() } });
      await prisma.auditLog.create({ data: { actorUserId: userId, actorRole: sessionUser.user.role || "CANDIDAT", action: "TRUST_VIDEO_STARTED", targetType: "VIDEO_SESSION", targetId: session.id } });
    } else if (parsed.data.action === "candidate") {
      const current = isA ? (Array.isArray(session.candidateA) ? session.candidateA : []) : (Array.isArray(session.candidateB) ? session.candidateB : []);
      if (current.length >= 100) return NextResponse.json({ error: "Limite de signalisation atteinte." }, { status: 429 });
      const next = [...current, parsed.data.candidate];
      await prisma.videoSession.update({ where: { id: session.id }, data: isA ? { candidateA: next } : { candidateB: next } });
    } else if (parsed.data.action === "start") {
      if (!isA) return NextResponse.json({ error: "Action réservée à l'initiateur." }, { status: 403 });
      await prisma.videoSession.update({ where: { id: session.id }, data: { status: "JOINING" } });
    }

    const fresh = await prisma.videoSession.findUnique({
      where: { id: session.id },
      include: { presentation: { select: { id: true, candidateUserId: true, companyUserId: true, candidateAlias: true, companyAlias: true, state: true, anonymousMessagingEnabled: true } } },
    });
    if (!fresh) return NextResponse.json({ error: "Session vidéo introuvable" }, { status: 404 });
    return NextResponse.json({ session: publicSession(fresh, userId) });
  }

  return NextResponse.json({ error: "Action non supportée" }, { status: 400 });
}

export async function PUT(request: Request) {
  const sessionUser = await auth();
  if (!sessionUser?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!iceServers()) return NextResponse.json({ error: "Service vidéo sécurisé non configuré." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 }); }
  const parsed = z.object({ presentationId: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "presentationId requis" }, { status: 400 });

  const presentation = await participantForPresentation(parsed.data.presentationId, sessionUser.user.id);
  if (!presentation || !presentation.candidateUserId || !presentation.companyUserId) {
    return NextResponse.json({ error: "Présentation non éligible à la vidéo sécurisée." }, { status: 403 });
  }

  const existing = await prisma.videoSession.findFirst({
    where: { presentationId: presentation.id, status: { in: ["CREATED", "JOINING", "OFFER_READY", "ACTIVE"] }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    include: { presentation: { select: { id: true, candidateUserId: true, companyUserId: true, candidateAlias: true, companyAlias: true, state: true, anonymousMessagingEnabled: true } } },
  });
  if (existing) return NextResponse.json({ session: publicSession(existing, sessionUser.user.id) }, { status: 200 });

  const created = await prisma.videoSession.create({
    data: {
      presentationId: presentation.id,
      createdByUserId: sessionUser.user.id,
      expiresAt: new Date(Date.now() + SESSION_MINUTES * 60_000),
    },
    include: { presentation: { select: { id: true, candidateUserId: true, companyUserId: true, candidateAlias: true, companyAlias: true, state: true, anonymousMessagingEnabled: true } } },
  });
  await prisma.auditLog.create({
    data: { actorUserId: sessionUser.user.id, actorRole: sessionUser.user.role || "CANDIDAT", action: "TRUST_VIDEO_CREATED", targetType: "VIDEO_SESSION", targetId: created.id, details: { presentationId: presentation.id, expiresAt: created.expiresAt.toISOString() } },
  });
  return NextResponse.json({ session: publicSession(created, sessionUser.user.id) }, { status: 201 });
}
