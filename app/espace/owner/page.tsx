import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const applicationLabels: Record<string, string> = {
  SUBMITTED: "Soumises",
  REVIEWING: "En étude",
  INTERVIEW: "Entretiens",
  SHORTLISTED: "Présélection",
  REJECTED: "Refusées",
  HIRED: "Recrutées",
};

export default async function OwnerPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "OWNER" && role !== "ADMIN")) redirect("/connexion");

  const [users, candidates, documents, companies, jobs, applications, sourcedCandidates, settings] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.candidateProfile.count(),
    prisma.candidateDocument.count(),
    prisma.company.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { members: true, jobs: true } } } }),
    prisma.job.findMany({ orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, title: true, status: true, company: { select: { name: true } }, updatedAt: true } }),
    prisma.application.findMany({ orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, status: true, createdAt: true, updatedAt: true } }),
    prisma.sourcedCandidate.findMany({ orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, name: true, source: true, status: true, matchingScore: true, updatedAt: true } }),
    prisma.systemSetting.count(),
  ]);

  const openJobs = jobs.filter((job) => job.status === "OPEN").length;
  const activeCompanies = companies.filter((company) => company._count.jobs > 0).length;
  const highMatches = sourcedCandidates.filter((candidate) => (candidate.matchingScore ?? 0) >= 80).length;
  const pendingSourcing = sourcedCandidates.filter((candidate) => ["DETECTED", "REVIEWING"].includes(candidate.status)).length;
  const statusCounts = Object.keys(applicationLabels).map((status) => ({ status, count: applications.filter((item) => item.status === status).length }));

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:w-[min(1280px,calc(100%-72px))] md:py-20">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Owner · Cockpit de pilotage</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Vue complète de Recrutement Privé.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">Données opérationnelles consolidées depuis PostgreSQL. Cet espace est réservé au pilotage global et à la supervision de la plateforme.</p>
        </div>
        <span className="border border-[#c7a15a]/30 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">{role}</span>
      </div>

      <div className="mt-10 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Candidats", candidates],
          ["CV / documents", documents],
          ["Entreprises", companies.length],
          ["Offres ouvertes", openJobs],
          ["Candidatures", applications.length],
          ["Profils sourcés", sourcedCandidates.length],
          ["Matching ≥ 80", highMatches],
          ["Paramètres système", settings],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-[#111] p-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</span>
            <p className="mt-4 font-serif text-3xl text-[#c7a15a]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
        <section className="border border-white/10 p-7">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Progression fonctionnelle</p>
          <h2 className="mt-3 font-serif text-2xl">État vérifiable des briques</h2>
          <div className="mt-7 space-y-3">
            {[
              ["Espace candidat", "Disponible"],
              ["Espace entreprise", "Disponible"],
              ["Espace consultant", "Disponible"],
              ["Administration", "Disponible"],
              ["Matching explicable", "Intégré"],
              ["Sourcing", "Intégré"],
              ["Rôle Owner", "Intégré"],
              ["Prestations & tarifs", "Structure prête"],
              ["Automatisations avancées", "À poursuivre"],
            ].map(([label, status]) => (
              <div key={label} className="flex items-center justify-between gap-4 border border-white/10 px-4 py-3">
                <span className="text-sm text-white/75">{label}</span>
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/40">{status}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-6 text-white/35">Les statuts ci-dessus décrivent l'état technique actuellement intégré ; aucun pourcentage artificiel n'est affiché.</p>
        </section>

        <section className="border border-white/10 p-7">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Pipeline</p>
          <h2 className="mt-3 font-serif text-2xl">Candidatures</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {statusCounts.map(({ status, count }) => (
              <div key={status} className="border border-white/10 p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">{applicationLabels[status]}</p>
                <p className="mt-2 font-serif text-2xl">{count}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-white/10 pt-5 text-xs leading-6 text-white/40">
            <p>{activeCompanies} entreprise(s) disposent d'au moins une offre.</p>
            <p>{pendingSourcing} profil(s) sourcé(s) restent à qualifier ou examiner.</p>
          </div>
        </section>
      </div>

      <section className="mt-8 border border-white/10 p-7">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Sourcing & matching</p>
            <h2 className="mt-3 font-serif text-2xl">Profils récemment détectés</h2>
          </div>
          <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">100 derniers</span>
        </div>
        <div className="mt-6 space-y-2">
          {sourcedCandidates.slice(0, 20).map((candidate) => (
            <div key={candidate.id} className="flex flex-col gap-2 border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-white/80">{candidate.name || "Profil sans nom"}</p>
                <p className="mt-1 text-xs text-white/35">{candidate.source}</p>
              </div>
              <div className="flex gap-5 text-[10px] uppercase tracking-[0.14em] text-white/40">
                <span>{candidate.status}</span>
                <span>{candidate.matchingScore ?? "—"}/100</span>
              </div>
            </div>
          ))}
          {sourcedCandidates.length === 0 && <p className="text-sm text-white/35">Aucun profil sourcé enregistré pour le moment.</p>}
        </div>
      </section>
    </section>
  );
}
