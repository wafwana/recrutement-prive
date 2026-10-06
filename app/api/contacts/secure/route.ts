import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertContactEligibility, completeContactMeeting, SECURE_CONTACT_MINUTES, SECURE_CONTACT_PRICE_HT, SECURE_CONTACT_PRICE_TTC } from "@/lib/contacts/secure-contact";

const createSchema = z.object({ presentationId: z.string().min(1), channel: z.enum(["MESSAGING","VIDEO"]).default("MESSAGING"), scheduledAt: z.string().datetime().optional(), candidateConsent: z.boolean().optional(), companyConsent: z.boolean().optional() });
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("consent"), meetingId: z.string().min(1), recordingConsent: z.boolean() }),
  z.object({ action: z.literal("complete"), meetingId: z.string().min(1) }),
  z.object({ action: z.literal("decision"), meetingId: z.string().min(1), decisionStatus: z.enum(["RECRUIT","CONTINUE","CLOSE"]), decisionNotes: z.string().max(2000).optional() }),
]);

async function participant(meetingId: string, userId: string) {
  return prisma.contactMeeting.findUnique({ where: { id: meetingId }, include: { presentation: { select: { candidateUserId: true, companyUserId: true, state: true } } });
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
      if (presentation.candidateUserId !== session.user.id && presentation.companyUserId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      const companyConsent = parsed.data.companyConsent === true && presentation.companyUserId === session.user.id;
      const candidateConsent = parsed.data.candidateConsent === true && presentation.candidateUserId === session.user.id;
      if (!companyConsent && !candidateConsent) return NextResponse.json({ error: "Le contact doit être autorisé par le participant connecté et rester soumis au consentement des deux participants avant enregistrement." }, { status: 409 });
      const meeting = await prisma.contactMeeting.create({ data: {
        presentationId: presentation.id, companyId: presentation.companyId, candidateId: presentation.candidateId,
        channel: parsed.data.channel, scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        durationMinutes: SECURE_CONTACT_MINUTES, priceHt: SECURE_CONTACT_PRICE_HT, priceTtc: SECURE_CONTACT_PRICE_TTC,
        paymentStatus: "PENDING", recordingNoticeShown: true,
        companyConsentAt: companyConsent ? new Date() : null, candidateConsentAt: candidateConsent ? new Date() : null,
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
  if (meeting.presentation.candidateUserId !== session.user.id && meeting.presentation.companyUserId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  if (parsed.data.action === "consent") {
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
