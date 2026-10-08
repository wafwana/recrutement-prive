import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { assertContactEligibility, completeContactMeeting, startContactMeeting, SECURE_CONTACT_MINUTES, SECURE_CONTACT_PRICE_HT, SECURE_CONTACT_PRICE_TTC } from "@/lib/contacts/secure-contact";

const createSchema = z.object({ presentationId: z.string().min(1), channel: z.enum(["MESSAGING","VIDEO"]).default("MESSAGING"), scheduledAt: z.string().datetime().optional() });
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("authorize"), meetingId: z.string().min(1), approve: z.boolean() }),
  z.object({ action: z.literal("confirm_transfer"), meetingId: z.string().min(1), reference: z.string().max(120).optional() }),
  z.object({ action: z.literal("consent"), meetingId: z.string().min(1), recordingConsent: z.boolean() }),
  z.object({ action: z.literal("start"), meetingId: z.string().min(1) }),
  z.object({ action: z.literal("complete"), meetingId: z.string().min(1) }),
  z.object({ action: z.literal("decision"), meetingId: z.string().min(1), decisionStatus: z.enum(["RECRUIT","CONTINUE","CLOSE"]), decisionNotes: z.string().max(2000).optional() }),
  z.object({ action: z.literal("accept_terms"), meetingId: z.string().min(1), contractKeys: z.array(z.string().min(1)).min(1).max(10) }),
]);

async function participant(meetingId: string) {
  return prisma.contactMeeting.findUnique({ where: { id: meetingId }, include: { presentation: { select: { candidateUserId: true, companyUserId: true, state: true } } } });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  let raw: unknown; try { raw = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  if (typeof raw === "object" && raw && "presentationId" in raw) {
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "Demande invalide" }, { status: 400 });
    try {
      const { presentation, completed } = await assertContactEligibility(parsed.data.presentationId);
      if (presentation.companyUserId !== session.user.id) return NextResponse.json({ error: "La demande de contact sécurisé doit être initiée par l’entreprise autorisée." }, { status: 403 });
      const existingOpen = await prisma.contactMeeting.findFirst({ where: { presentationId: presentation.id, status: { in: ["REQUESTED", "CONFIRMED", "ACTIVE"] } }, select: { id: true } });
      if (existingOpen) return NextResponse.json({ error: "Un contact sécurisé est déjà ouvert pour cette présentation." }, { status: 409 });
            const meeting = await prisma.contactMeeting.create({ data: {
        presentationId: presentation.id, companyId: presentation.companyId, candidateId: presentation.candidateId,
        channel: parsed.data.channel, scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        durationMinutes: SECURE_CONTACT_MINUTES, priceHt: SECURE_CONTACT_PRICE_HT, priceTtc: SECURE_CONTACT_PRICE_TTC,
        paymentStatus: "PENDING", recordingNoticeShown: true,
        companyConsentAt: null, candidateConsentAt: null,
        securityDetails: { aliasesOnly: true, coordinateExchangeBlocked: true, maxMinutes: 30, contactNumber: completed + 1 },
      }});
      await prisma.auditLog.create({ data: { actorUserId: session.user.id, actorRole: session.user.role || "CANDIDAT", action: "SECURE_CONTACT_REQUESTED", targetType: "CONTACT_MEETING", targetId: meeting.id, details: { presentationId: presentation.id, channel: meeting.channel, priceHt: 82.5, priceTtc: 99, durationMinutes: 30 } } });
      return NextResponse.json({ meeting }, { status: 201 });
    } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Contact impossible" }, { status: 409 }); }
  }

  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  const meeting = await participant(parsed.data.meetingId);
  if (!meeting) return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });

  if (parsed.data.action === "confirm_transfer") {
    if (session.user.role !== "OWNER" && !(await import("@/lib/auth/permissions")).hasPermission(session.user.id, session.user.role, "FACTURATION")) return NextResponse.json({ error: "Confirmation financière réservée à l’OWNER ou à un ADMIN habilité à la facturation." }, { status: 403 });
    const updated = await prisma.contactMeeting.update({ where: { id: meeting.id }, data: { paymentStatus: "PAID", paidAt: new Date(), paymentProvider: "MANUAL_INVOICE", paymentReference: parsed.data.reference || meeting.paymentReference } });
    await prisma.auditLog.create({ data: { actorUserId: session.user.id, actorRole: session.user.role || "OWNER", action: "SECURE_CONTACT_PAYMENT_CONFIRMED", targetType: "CONTACT_MEETING", targetId: meeting.id, details: { method: "BANK_TRANSFER" } } });
    return NextResponse.json({ meeting: updated });
  }
  if (parsed.data.action === "authorize") {
    if (session.user.role !== "OWNER" && !(await import("@/lib/auth/permissions")).hasPermission(session.user.id, session.user.role, "SECURE_CONTACTS_AUTHORIZE")) return NextResponse.json({ error: "Autorisation réservée à l’OWNER ou à un ADMIN explicitement habilité." }, { status: 403 });
    if (meeting.status !== "REQUESTED") return NextResponse.json({ error: "Ce contact n’est plus en attente d’autorisation." }, { status: 409 });
    const status = parsed.data.approve ? "CONFIRMED" : "REJECTED";
    const updated = await prisma.contactMeeting.update({ where: { id: meeting.id }, data: { status } });
    await prisma.auditLog.create({ data: { actorUserId: session.user.id, actorRole: session.user.role || "OWNER", action: parsed.data.approve ? "SECURE_CONTACT_AUTHORIZED" : "SECURE_CONTACT_REJECTED", targetType: "CONTACT_MEETING", targetId: meeting.id, details: { delegatedAdmin: session.user.role === "ADMIN" } } });
    return NextResponse.json({ meeting: updated });
  }
  if (meeting.presentation.candidateUserId !== session.user.id && meeting.presentation.companyUserId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  if (parsed.data.action === "accept_terms") {
    if (!["REQUESTED", "CONFIRMED", "ACTIVE"].includes(meeting.status)) return NextResponse.json({ error: "Les conditions ne peuvent plus être acceptées sur ce contact." }, { status: 409 });
    const requiredKeys = meeting.presentation.companyUserId === session.user.id
      ? ["ENTREPRISE_CONTACT", "INTERVIEW_SECURE", "ANTI_CIRCUMVENTION", "SECURE_CHANNEL_POLICY"]
      : ["CANDIDAT_CONTACT", "INTERVIEW_SECURE", "ANTI_CIRCUMVENTION", "SECURE_CHANNEL_POLICY"];
    if (!requiredKeys.every((key) => ("contractKeys" in parsed.data ? parsed.data.contractKeys : []).includes(key))) {
      return NextResponse.json({ error: "Tous les documents contractuels requis doivent être acceptés." }, { status: 400 });
    }
    const security = (meeting.securityDetails && typeof meeting.securityDetails === "object" && !Array.isArray(meeting.securityDetails))
      ? meeting.securityDetails as Record<string, unknown>
      : {};
    const acceptances = security.contractAcceptances && typeof security.contractAcceptances === "object" && !Array.isArray(security.contractAcceptances)
      ? security.contractAcceptances as Record<string, unknown>
      : {};
    const nextAcceptances = {
      ...acceptances,
      [session.user.id]: { role: session.user.role, keys: requiredKeys, acceptedAt: new Date().toISOString() },
    };
    const updated = await prisma.contactMeeting.update({
      where: { id: meeting.id },
      data: { securityDetails: { ...security, contractAcceptances: nextAcceptances } as Prisma.InputJsonValue },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        actorRole: session.user.role || "CANDIDAT",
        action: "SECURE_CONTACT_CONTRACTS_ACCEPTED",
        targetType: "CONTACT_MEETING",
        targetId: meeting.id,
        details: { contractKeys: requiredKeys },
      },
    });
    return NextResponse.json({ meeting: updated });
  }
  if (parsed.data.action === "start") {
    try {
      const updated = await startContactMeeting(meeting.id, session.user.id);
      return NextResponse.json({ meeting: updated });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Démarrage impossible" }, { status: 409 });
    }
  }
  if (parsed.data.action === "consent") {
    if (!["CONFIRMED", "ACTIVE"].includes(meeting.status)) return NextResponse.json({ error: "Le contact doit être autorisé avant le consentement." }, { status: 409 });
    const data = meeting.presentation.candidateUserId === session.user.id ? { candidateConsentAt: parsed.data.recordingConsent ? new Date() : null } : { companyConsentAt: parsed.data.recordingConsent ? new Date() : null };
    const updated = await prisma.contactMeeting.update({ where: { id: meeting.id }, data: { ...data, recordingNoticeShown: true } });
    return NextResponse.json({ meeting: updated });
  }
  if (parsed.data.action === "complete") {
    const updated = await completeContactMeeting(meeting.id, session.user.id);
    return NextResponse.json({ meeting: updated });
  }
  if (meeting.presentation.companyUserId !== session.user.id) return NextResponse.json({ error: "Décision réservée à l'entreprise autorisée." }, { status: 403 });
  const updated = await prisma.contactMeeting.update({ where: { id: meeting.id }, data: { decisionStatus: parsed.data.decisionStatus, decisionNotes: parsed.data.decisionNotes, decisionAt: new Date(), decisionRequired: false } });
  await prisma.auditLog.create({ data: { actorUserId: session.user.id, actorRole: session.user.role || "ENTREPRISE", action: "SECURE_CONTACT_DECISION", targetType: "CONTACT_MEETING", targetId: meeting.id, details: { decisionStatus: parsed.data.decisionStatus } } });
  return NextResponse.json({ meeting: updated });
}
