import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const statusLabels: Record<string, string> = {
  SUBMITTED: "Soumises",
  REVIEWING: "En étude",
  INTERVIEW: "Entretiens",
  SHORTLISTED: "Présélection",
  REJECTED: "Refusées",
  HIRED: "Recrutées",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/connexion");

  const [users, companies, jobs, applications] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.company.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { members: true, jobs: true } } } }),
    prisma.job.findMany({ orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, title: true, status: true, company: { select: { name: true } }, updatedAt: true } }),
    prisma.application.findMany({ orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, status: true, createdAt: true, updatedAt: true } }),
  ]);

  const statusCounts = Object.keys(statusLabels).map((status) => ({
    status,
    count: applications.filter((application) => application.status === status).length,
  }));

  const openJobs = jobs.filter((job) => job.status === "OPEN").length;
  const activeCompanies = companies.filter((company) => company._count.jobs > 0).length;

  return (
    <section className="mx-auto w-[min(1200px,calc(100%-40px))] py-16 md:w-[min(1200px,calc(100%-72px))] md:py-24">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Administration</p>
      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-5xl sm:text-6xl">Pilotage global de la plateforme.</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-white/50">Vue consolidée des utilisateurs, entreprises, offres et candidatures. Les données affichées proviennent directement de PostgreSQL.</p>
        </div>
        <span className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/40">ADMIN</span>
      </div>

      <div className="mt-12 grid gap-px bg-white/10 md:grid-cols-4">
        {[
          ["Utilisateurs", users.length],
          ["Entreprises", companies.length],
          ["Offres ouvertes", openJobs],
          ["Candidatures", applications.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-[#111] p-7">
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">{label}</span>
            <p className="mt-6 font-serif text-4xl text-[#c7a15a]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <section className="border border-white/10 p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Reporting</p>
          <h2 className="mt-3 font-serif text-2xl">Répartition des candidatures</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {statusCounts.map(({ status, count }) => (
              <div key={status} className="border border-white/10 p-5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">{statusLabels[status]}</p>
                <p className="mt-3 font-serif text-2xl">{count}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-white/10 pt-6 text-sm text-white/45">
            <p>{activeCompanies} entreprise(s) avec au moins une offre.</p>
            <p className="mt-2">{jobs.length - openJobs} offre(s) dans un statut autre que OPEN.</p>
          </div>
        </section>

        <section className="border border-white/10 p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Utilisateurs</p>
          <div className="mt-6 space-y-3">
            {users.slice(0, 12).map((user) => (
              <div key={user.id} className="border border-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-white/80">{user.name || user.email}</p>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-white/35">{user.role}</span>
                </div>
                <p className="mt-1 text-xs text-white/35">{user.email}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-10 border border-white/10 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Activité récente</p>
            <h2 className="mt-3 font-serif text-2xl">Offres récemment modifiées</h2>
          </div>
          <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">100 dernières</span>
        </div>
        <div className="mt-6 space-y-2">
          {jobs.slice(0, 20).map((job) => (
            <div key={job.id} className="flex flex-col gap-2 border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-serif text-lg">{job.title}</p>
                <p className="mt-1 text-xs text-white/40">{job.company.name}</p>
              </div>
              <span className="text-[10px] uppercase tracking-[0.16em] text-white/35">{job.status}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
