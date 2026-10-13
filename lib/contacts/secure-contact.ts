import { prisma } from "@/lib/prisma";

export const SECURE_CONTACT_MINUTES = 30;
export const SECURE_CONTACT_PRICE_HT = 82.5;
export const SECURE_CONTACT_VAT_RATE = 20;
export const SECURE_CONTACT_PRICE_TTC = 99;
export const MAX_CONTACTS_BEFORE_DECISION = 3;

export async function countCompletedContacts(presentationId: string) {
  return prisma.contactMeeting.count({ where: { presentationId, status: "COMPLETED" } });
}

export async function assertContactEligibility(presentationId: string) {
  const presentation = await prisma.missionPresentation.findUnique({
    where: { id: presentationId },
    select: { id: true, companyId: true, candidateId: true, state: true, anonymousMessagingEnabled: true, candidateUserId: true, companyUserId: true },
  });
  if (!presentation) throw new Error("Présentation introuvable.");
  if (!presentation.anonymousMessagingEnabled) throw new Error("Le contact sécurisé n'est pas activé.");
  if (["IDENTITE_DEBLOQUEE", "MISSION_TERMINEE"].includes(presentation.state)) throw new Error("Cette présentation est fermée.");
  const completed = await countCompletedContacts(presentationId);
  if (completed >= MAX_CONTACTS_BEFORE_DECISION) throw new Error("Après trois contacts, la décision de l'entreprise est requise.");
  return { presentation, completed };
}

export async function startContactMeeting(meetingId: string, actorUserId: string) {
  const meeting = await prisma.contactMeeting.findUnique({ where: { id: meetingId }, include: { presentation: true } });
  if (!meeting) throw new Error("Contact introuvable.");
  if (meeting.presentation.candidateUserId !== actorUserId && meeting.presentation.companyUserId !== actorUserId) throw new Error("Accès refusé.");
  if (meeting.status !== "CONFIRMED") throw new Error("Le cabinet doit d’abord autoriser ce contact.");
  if (meeting.paymentStatus !== "PAID") throw new Error("Le contact doit être réglé avant son démarrage.");
  const security = (meeting.securityDetails && typeof meeting.securityDetails === "object" && !Array.isArray(meeting.securityDetails))
    ? meeting.securityDetails as Record<string, unknown>
    : {};
  const acceptances = security.contractAcceptances && typeof security.contractAcceptances === "object" && !Array.isArray(security.contractAcceptances)
    ? security.contractAcceptances as Record<string, unknown>
    : {};
  if (!acceptances[meeting.presentation.candidateUserId || ""]) throw new Error("Le candidat doit accepter les conditions contractuelles avant le démarrage du contact.");
  if (meeting.candidateConsentAt === null || meeting.companyConsentAt === null) {
    // The meeting may start without recording. Recording is a separate, two-party consented feature.
    return prisma.contactMeeting.update({ where: { id: meetingId }, data: { status: "ACTIVE", startedAt: meeting.startedAt ?? new Date() } });
  }
  return prisma.contactMeeting.update({
    where: { id: meetingId },
    data: { status: "ACTIVE", startedAt: meeting.startedAt ?? new Date(), recordingStartedAt: new Date() },
  });
}

export async function completeContactMeeting(meetingId: string, actorUserId: string) {
  const meeting = await prisma.contactMeeting.findUnique({ where: { id: meetingId }, include: { presentation: true } });
  if (!meeting) throw new Error("Contact introuvable.");
  if (meeting.presentation.candidateUserId !== actorUserId && meeting.presentation.companyUserId !== actorUserId) throw new Error("Accès refusé.");
  if (!meeting.startedAt) throw new Error("Le contact n'a pas commencé.");
  const now = new Date();
  const minEnd = new Date(meeting.startedAt.getTime() + meeting.durationMinutes * 60_000);
  if (now < minEnd) throw new Error("Le contact de 30 minutes ne peut être clôturé avant sa durée prévue.");
  const updated = await prisma.contactMeeting.update({
    where: { id: meetingId },
    data: {
      status: "COMPLETED",
      endedAt: now,
      recordingEndedAt: meeting.recordingStartedAt ? now : null,
      decisionRequired: (await countCompletedContacts(meeting.presentationId)) + 1 >= MAX_CONTACTS_BEFORE_DECISION,
    },
  });
  return updated;
}
