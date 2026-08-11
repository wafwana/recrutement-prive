import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "./ProfileForm";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  SUBMITTED: "Candidature envoyée",
  REVIEWING: "En cours d'étude",
  INTERVIEW: "Entretien",
  SHORTLISTED: "Présélectionné",
  REJECTED: "Clôturée",
  HIRED: "Recruté",
};

export default async function CandidatPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CANDIDAT") return null;

  const profile = await prisma.candidateProfile.findUnique({ where: { userId: session.user.id } });
  const applications = profile
    ? await prisma.application.findMany({
        where: { candidateId: profile.id, userId: session.user.id },
        include: { job: { include: { company: true } } },
        orderBy: { updatedAt: "desc" },
      })
    : [];
  const documents = profile
    ? await prisma.candidateDocument.findMany({ where: { candidateId: profile.id }, orderBy: { createdAt: "desc" } })
    : [];

  const stats = [
    ["Profil", profile?.headline ? "Complété" : "À compléter", "Votre présentation professionnelle"],
    ["Candidatures", String(applications.length), "Suivi de vos opportunités"],
    ["Documents", String(documents.length + (profile?.cvUrl ? 1 : 0)), "CV et pièces utiles"],
  ];

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-16 md:w-[min(1180px,calc(100%-72px))] md:py-24">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace candidat</p>
      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-5xl sm:text-6xl">Votre parcours, en un regard.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/50">Vos informations et candidatures sont reliées à votre compte sécurisé.</p>
        </div>
        <div className="border border-white/10 px-5 py-4 text-right text-[10px] uppercase tracking-[0.18em] text-white/45">{session.user.email}</div>
      </div>

      <div className="mt-12 grid gap-px bg-white/10 md:grid-cols-3">
        {stats.map(([label, value, description]) => (
          <div key={label} className="bg-[#111] p-7">
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">{label}</span>
            <p className="mt-6 font-serif text-3xl text-[#c7a15a]">{value}</p>
            <p className="mt-3 text-sm text-white/45">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
        <ProfileForm profile={profile} />
        <aside className="space-y-8">
          <section className="border border-white/10 p-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Candidatures</p>
            <div className="mt-6 space-y-4">
              {applications.length === 0 ? (
                <p className="text-sm leading-7 text-white/45">Aucune candidature n'est encore enregistrée sur votre compte.</p>
              ) : (
                applications.map((application) => (
                  <div key={application.id} className="border-b border-white/10 pb-4 last:border-0 last:pb-0">
                    <p className="font-serif text-xl">{application.job.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/35">{application.job.company.name}</p>
                    <p className="mt-3 text-sm text-white/55">{statusLabels[application.status] ?? application.status}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="border border-white/10 bg-[#111] p-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Documents</p>
            <div className="mt-6 space-y-3">
              {profile?.cvUrl ? <Link href={profile.cvUrl} target="_blank" className="block text-sm text-white/70 hover:text-white">CV principal ↗</Link> : null}
              {documents.map((document) => (
                <Link key={document.id} href={document.url} target="_blank" className="block text-sm text-white/70 hover:text-white">{document.name} ↗</Link>
              ))}
              {!profile?.cvUrl && documents.length === 0 ? <p className="text-sm leading-7 text-white/45">Ajoutez votre CV depuis votre profil pour le rendre disponible à votre consultant.</p> : null}
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-10 border border-white/10 p-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Confidentialité</p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">Votre espace ne donne accès qu'aux données rattachées à votre compte candidat. Les candidatures sont limitées à vos propres enregistrements et les documents sont associés à votre profil.</p>
      </div>
    </section>
  );
}
