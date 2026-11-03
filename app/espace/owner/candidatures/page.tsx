import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { presentCandidateToCompany } from "./actions";

export default async function OwnerApplicationsPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");

  const applications = await prisma.application.findMany({
    where: {
      presentations: { none: {} },
      status: { notIn: ["REJECTED", "HIRED"] },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      status: true,
      createdAt: true,
      candidate: {
        select: {
          headline: true,
          location: true,
          experienceYears: true,
          user: { select: { name: true } },
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          company: { select: { name: true } },
        },
      },
    },
  });

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-12 md:w-[min(1180px,calc(100%-72px))] md:py-20">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Owner · Décision de présentation</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Candidatures à examiner.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">
            Seul l’OWNER décide de présenter un candidat à l’entreprise. La présentation est enregistrée dans l’historique et le journal d’audit.
          </p>
        </div>
        <Link href="/espace/owner" className="border border-white/15 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/65 hover:border-[#c7a15a] hover:text-[#c7a15a]">
          ← Retour au cockpit
        </Link>
      </div>

      <div className="mt-10 grid gap-4">
        {applications.map((application) => (
          <article key={application.id} className="border border-white/10 bg-[#111] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">{application.job.company.name}</p>
                <h2 className="mt-2 font-serif text-2xl">{application.candidate.user.name || "Candidat sans nom"}</h2>
                <p className="mt-1 text-sm text-white/55">{application.candidate.headline || "Fonction non renseignée"}</p>
                <p className="mt-3 text-xs text-white/40">
                  Offre : {application.job.title} · Statut : {application.status}
                </p>
                <p className="mt-1 text-xs text-white/35">
                  {[application.candidate.location, application.candidate.experienceYears != null ? `${application.candidate.experienceYears} an(s) d’expérience` : null].filter(Boolean).join(" · ") || "Informations complémentaires non renseignées"}
                </p>
              </div>
              <form action={presentCandidateToCompany.bind(null, application.id)}>
                <button type="submit" className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] hover:bg-[#c7a15a]/10">
                  Présenter à l’entreprise
                </button>
              </form>
            </div>
          </article>
        ))}
        {applications.length === 0 ? (
          <div className="border border-white/10 bg-[#111] p-8 text-sm text-white/45">
            Aucune candidature en attente de décision de présentation.
          </div>
        ) : null}
      </div>
    </section>
  );
}
