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

export async function completeContactMeeting(meetingId: string, actorUserId: string) {
  const meeting = await prisma.contactMeeting.findUnique({ where: { id: meetingId }, include: { presentation: true } });
  if (!meeting) throw new Error("Contact introuvable.");
  if (meeting.presentation.candidateUserId !== actorUserId && meeting.presentation.companyUserId !== actorUserId) throw new Error("Accès refusé.");
  const updated = await prisma.contactMeeting.update({ where: { id: meetingId }, data: { status: "COMPLETED", endedAt: new Date(), decisionRequired: (await countCompletedContacts(meeting.presentationId)) + 1 >= MAX_CONTACTS_BEFORE_DECISION } });
  return updated;
}
