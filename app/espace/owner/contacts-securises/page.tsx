import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ExecutiveSearchTabs from "./ExecutiveSearchTabs";

export default async function OwnerContactsPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");

  const [
    pendingOutreach,
    sentOutreach,
    openMeetings,
    decisionsRequired,
    completedMeetings,
    authorizationRows,
    presentationRows,
    meetingRows,
    outreachRows,
  ] = await Promise.all([
    prisma.outreachContact.count({ where: { status: { in: ["PENDING", "QUEUED"] } } }),
    prisma.outreachContact.count({ where: { status: { in: ["SENT", "DELIVERED"] } } }),
    prisma.contactMeeting.count({ where: { status: { in: ["REQUESTED", "CONFIRMED", "ACTIVE"] } } }),
    prisma.contactMeeting.count({ where: { decisionRequired: true } }),
    prisma.contactMeeting.count({ where: { status: "COMPLETED" } }),
    prisma.contactMeeting.findMany({
      where: { status: "REQUESTED" },
      include: { presentation: { select: { candidateAlias: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    prisma.missionPresentation.findMany({
      orderBy: { presentedAt: "desc" },
      take: 100,
      select: {
        id: true,
        candidateAlias: true,
        companyAlias: true,
        state: true,
        presentedAt: true,
        mission: { select: { title: true } },
        contactMeetings: {
          select: { status: true, decisionRequired: true },
        },
      },
    }),
    prisma.contactMeeting.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        channel: true,
        scheduledAt: true,
        startedAt: true,
        endedAt: true,
        updatedAt: true,
        createdAt: true,
        durationMinutes: true,
        priceTtc: true,
        paymentStatus: true,
        decisionRequired: true,
        decisionStatus: true,
        presentation: {
          select: {
            candidateAlias: true,
            companyAlias: true,
            state: true,
            mission: { select: { title: true } },
          },
        },
      },
    }),
    prisma.outreachContact.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        recipientType: true,
        status: true,
        source: true,
        campaignKey: true,
        createdAt: true,
        sentAt: true,
        repliedAt: true,
      },
    }),
  ]);

  const presentations = presentationRows.map((item) => ({
    id: item.id,
    candidateAlias: item.candidateAlias,
    companyAlias: item.companyAlias,
    missionTitle: item.mission.title,
    state: item.state,
    presentedAt: item.presentedAt.toISOString(),
    totalContacts: item.contactMeetings.length,
    completedContacts: item.contactMeetings.filter((meeting) => meeting.status === "COMPLETED").length,
    decisionRequired: item.contactMeetings.some((meeting) => meeting.decisionRequired),
  }));

  const meetings = meetingRows.map((item) => ({
    id: item.id,
    candidateAlias: item.presentation.candidateAlias,
    companyAlias: item.presentation.companyAlias,
    missionTitle: item.presentation.mission.title,
    status: item.status,
    channel: item.channel,
    createdAt: item.createdAt.toISOString(),
    scheduledAt: item.scheduledAt?.toISOString() ?? null,
    startedAt: item.startedAt?.toISOString() ?? null,
    endedAt: item.endedAt?.toISOString() ?? null,
    updatedAt: item.updatedAt.toISOString(),
    durationMinutes: item.durationMinutes,
    priceTtc: item.priceTtc,
    paymentStatus: item.paymentStatus,
    decisionRequired: item.decisionRequired,
    decisionStatus: item.decisionStatus,
  }));

  const outreach = outreachRows.map((item) => ({
    id: item.id,
    recipientType: item.recipientType,
    status: item.status,
    source: item.source,
    campaignKey: item.campaignKey,
    createdAt: item.createdAt.toISOString(),
    sentAt: item.sentAt?.toISOString() ?? null,
    repliedAt: item.repliedAt?.toISOString() ?? null,
  }));

  return (
    <main className="min-h-screen bg-[#081625] p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#10283e] to-[#081625] p-8 shadow-2xl md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400">RECRUTEMENT PRIVÉ · EXECUTIVE SEARCH</p>
          <div className="mt-4 max-w-4xl">
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Executive Search & Secure Interview Center</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">Le centre de pilotage des présentations anonymisées et des contacts sécurisés entre candidat et entreprise, avec autorisation humaine et suivi du processus jusqu’à la décision.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">30 min · 99 € TTC</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Messagerie protégée</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Visioconférence interne</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">3 contacts → décision</span>
          </div>
        </header>

        <ExecutiveSearchTabs
          counts={{ pendingOutreach, sentOutreach, openMeetings, completedMeetings, decisionsRequired }}
          authorizations={authorizationRows.map((meeting) => ({
            id: meeting.id,
            alias: meeting.presentation.candidateAlias,
            channel: meeting.channel,
            createdAt: meeting.createdAt.toISOString(),
          }))}
          presentations={presentations}
          meetings={meetings}
          outreach={outreach}
        />
      </div>
    </main>
  );
}
