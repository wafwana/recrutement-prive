import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const labels: Record<string, string> = {
  SUBMITTED: "Candidature envoyée",
  REVIEWING: "En étude",
  INTERVIEW: "Entretien",
  SHORTLISTED: "Présentée à l'entreprise",
  REJECTED: "Non retenue",
  HIRED: "Recruté",
};

export default async function CandidateApplicationDetail({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CANDIDAT") redirect("/espace");

  const { applicationId } = await params;
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: session.user.id },
    select: {
      id: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      job: {
        select: {
          title: true,
          location: true,
          description: true,
          missionType: true,
          status: true,
        },
      },
      history: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, action: true, fromStatus: true, toStatus: true, createdAt: true },
      },
    },
  });

  if (!application) redirect("/espace/candidat/candidatures");

  const presentation = await prisma.missionPresentation.findFirst({
    where: { applicationId: application.id, candidateUserId: session.user.id, state: { notIn: ["IDENTITE_DEBLOQUEE", "MISSION_TERMINEE"] } },
    select: {
      id: true,
      candidateAlias: true,
      contactMeetings: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, paymentStatus: true, decisionRequired: true, createdAt: true, securityDetails: true } },
    },
  });
  const meeting = presentation?.contactMeetings[0] ?? null;
  const completedContacts = presentation ? await prisma.contactMeeting.count({ where: { presentationId: presentation.id, status: "COMPLETED" } }) : 0;

  async function acceptCandidateTerms(formData: FormData) {
    "use server";
    const actor = await auth();
    if (!actor?.user?.id || actor.user.role !== "CANDIDAT") return;
    const meetingId = String(formData.get("meetingId") || "");
    const current = await prisma.contactMeeting.findFirst({ where: { id: meetingId, presentation: { candidateUserId: actor.user.id } } });
    if (!current) return;
    const security = current.securityDetails && typeof current.securityDetails === "object" && !Array.isArray(current.securityDetails) ? current.securityDetails as Record<string, unknown> : {};
    const acceptances = security.contractAcceptances && typeof security.contractAcceptances === "object" && !Array.isArray(security.contractAcceptances) ? security.contractAcceptances as Record<string, unknown> : {};
    await prisma.contactMeeting.update({ where: { id: current.id }, data: { securityDetails: { ...security, contractAcceptances: { ...acceptances, [actor.user.id]: { role: "CANDIDAT", keys: ["CANDIDAT_CONTACT","INTERVIEW_SECURE","ANTI_CIRCUMVENTION","SECURE_CHANNEL_POLICY"], acceptedAt: new Date().toISOString() } } } } });
    await prisma.auditLog.create({ data: { actorUserId: actor.user.id, actorRole: "CANDIDAT", action: "SECURE_CONTACT_CONTRACTS_ACCEPTED", targetType: "CONTACT_MEETING", targetId: current.id, details: { source: "candidate_application" } } });
  }

  async function startCandidateContact(formData: FormData) {
    "use server";
    const actor = await auth();
    if (!actor?.user?.id || actor.user.role !== "CANDIDAT") return;
    const meetingId = String(formData.get("meetingId") || "");
    const { startContactMeeting } = await import("@/lib/contacts/secure-contact");
    await startContactMeeting(meetingId, actor.user.id);
  }

  async function completeCandidateContact(formData: FormData) {
    "use server";
    const actor = await auth();
    if (!actor?.user?.id || actor.user.role !== "CANDIDAT") return;
    const meetingId = String(formData.get("meetingId") || "");
    const { completeContactMeeting } = await import("@/lib/contacts/secure-contact");
    await completeContactMeeting(meetingId, actor.user.id);
  }

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-12 md:w-[min(1180px,calc(100%-72px))]">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace candidat · Dossier</p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl">{application.job.title}</h1>
          <p className="mt-3 text-sm text-white/45">{application.job.location || "Localisation non précisée"}</p>
        </div>
        <span className="border border-[#c7a15a]/30 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#c7a15a]">
          {labels[application.status] ?? application.status}
        </span>
      </div>

      <Link href="/espace/candidat/candidatures" className="mt-6 inline-block border border-white/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-white/60">
        ← Retour aux candidatures
      </Link>

      {meeting && (
        <section className="mt-10 border border-[#c7a15a]/30 bg-[#111] p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Secure Interview Center</p>
          <h2 className="mt-3 font-serif text-3xl">Votre entretien sécurisé</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">30 minutes, identité protégée, aucun échange direct de coordonnées. Le règlement est effectué par l'entreprise ; votre acceptation des conditions est requise avant le démarrage.</p>
          <div className="mt-6 border border-white/10 p-5 text-xs leading-6 text-white/50">
            Conditions : contact candidat · entretien sécurisé · confidentialité et anti-contournement · politique des canaux sécurisés.
          </div>
          {(() => {
            const security = meeting.securityDetails && typeof meeting.securityDetails === "object" && !Array.isArray(meeting.securityDetails) ? meeting.securityDetails as Record<string, unknown> : {};
            const accepts = security.contractAcceptances && typeof security.contractAcceptances === "object" && !Array.isArray(security.contractAcceptances) ? security.contractAcceptances as Record<string, unknown> : {};
            const accepted = Boolean(accepts[session.user.id]);
            return (
              <div className="mt-6 flex flex-wrap gap-3">
                {!accepted && <form action={acceptCandidateTerms}><input type="hidden" name="meetingId" value={meeting.id}/><button className="border border-[#c7a15a] bg-[#c7a15a] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-black">Accepter les conditions</button></form>}
                {accepted && meeting.status === "CONFIRMED" && meeting.paymentStatus === "PAID" && <form action={startCandidateContact}><input type="hidden" name="meetingId" value={meeting.id}/><button className="border border-[#c7a15a] bg-[#c7a15a] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-black">Démarrer le contact</button></form>}
                {meeting.status === "ACTIVE" && <form action={completeCandidateContact}><input type="hidden" name="meetingId" value={meeting.id}/><button className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]">Terminer le contact</button></form>}
              </div>
            );
          })()}
          <p className="mt-5 text-xs text-white/30">Contact {Math.min(completedContacts + 1, 3)}/3 · statut {meeting.status} · règlement {meeting.paymentStatus}</p>
        </section>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <article className="border border-white/10 bg-[#111] p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Dossier de candidature</p>
          <p className="mt-5 text-sm leading-7 text-white/60">
            {application.job.description || "La description détaillée de cette mission n'est pas disponible."}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 text-xs text-white/45">
            <div className="border border-white/10 p-4">Type de mission : {application.job.missionType || "Non précisé"}</div>
            <div className="border border-white/10 p-4">Offre : {application.job.status === "OPEN" ? "Ouverte" : "En traitement"}</div>
          </div>
          {application.notes && (
            <div className="mt-8 border-l-2 border-[#c7a15a] bg-white/5 p-4 text-sm text-white/60">
              Votre message : {application.notes}
            </div>
          )}
        </article>

        <aside className="border border-[#c7a15a]/20 bg-[#111] p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Historique du dossier</p>
          <div className="mt-6 space-y-5">
            {application.history.length === 0 ? (
              <p className="text-sm text-white/45">Aucun événement enregistré.</p>
            ) : (
              application.history.map((item) => (
                <div key={item.id} className="border-l border-white/10 pl-4">
                  <p className="text-xs text-white/70">{item.action}</p>
                  <p className="mt-1 text-[10px] text-white/35">
                    {item.fromStatus ? `${item.fromStatus} → ` : ""}{item.toStatus || ""}
                  </p>
                  <p className="mt-1 text-[10px] text-white/25">{new Date(item.createdAt).toLocaleString("fr-FR")}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
