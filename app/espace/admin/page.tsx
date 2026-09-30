import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

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
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "OWNER")) {
    redirect("/connexion");
  }

  const userId = session.user.id;
  const role = session.user.role;
  const isOwner = role === "OWNER";

  // Check granular permissions for ADMIN (OWNER has all true)
  const [
    canViewCandidates,
    canManageJobs,
    canManageCompanies,
    canViewReporting,
    canManageSettings,
    canSourcing,
    canCvIntake,
  ] = await Promise.all([
    hasPermission(userId, role, "CANDIDATES_VIEW"),
    hasPermission(userId, role, "JOBS_MANAGE"),
    hasPermission(userId, role, "COMPANIES_MANAGE"),
    hasPermission(userId, role, "REPORTING"),
    hasPermission(userId, role, "PLATFORM_SETTINGS"),
    hasPermission(userId, role, "SOURCING"),
    hasPermission(userId, role, "CV_INTAKE"),
  ]);

  // Fetch only data authorized by active permissions
  const [users, companies, jobs, applications] = await Promise.all([
    canViewCandidates || isOwner
      ? prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, email: true, role: true, createdAt: true } })
      : Promise.resolve([]),
    canManageCompanies || isOwner
      ? prisma.company.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { members: true, jobs: true } } } })
      : Promise.resolve([]),
    canManageJobs || isOwner
      ? prisma.job.findMany({ orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, title: true, status: true, company: { select: { name: true } }, updatedAt: true } })
      : Promise.resolve([]),
    canViewReporting || isOwner
      ? prisma.application.findMany({ orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, status: true, createdAt: true, updatedAt: true } })
      : Promise.resolve([]),
  ]);

  const statusCounts = Object.keys(statusLabels).map((status) => ({
    status,
    count: applications.filter((application) => application.status === status).length,
  }));
  const openJobs = jobs.filter((job) => job.status === "OPEN").length;
  const activeCompanies = companies.filter((company) => company._count.jobs > 0).length;

  return (
    <section className="mx-auto w-[min(1200px,calc(100%-40px))] py-16 md:w-[min(1200px,calc(100%-72px))] md:py-24">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace Administration</p>
      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-5xl sm:text-6xl">Pilotage de la plateforme.</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-white/50">
            Vue consolidée des fonctionnalités et données attribuées par l&apos;Owner. Les modules non autorisés sont strictement masqués.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/espace/admin/autorisations"
            className="border border-[#c7a15a]/50 bg-[#c7a15a]/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a] hover:bg-[#c7a15a] hover:text-black"
          >
            Mes Autorisations Actives
          </Link>
          {canManageSettings && (
            <Link
              href="/espace/admin/configuration"
              className="border border-white/20 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/80 hover:border-white/40"
            >
              Configuration
            </Link>
          )}
          {canSourcing && (
            <Link
              href="/espace/owner/sourcing"
              className="border border-white/20 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/80 hover:border-white/40"
            >
              Sourcing
            </Link>
          )}
          {canCvIntake && (
            <Link
              href="/espace/owner/cv-intake"
              className="border border-white/20 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/80 hover:border-white/40"
            >
              Import CV
            </Link>
          )}
          {isOwner && (
            <>
              <Link href="/espace/owner" className="border border-[#c7a15a]/40 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">
                Cockpit Owner
              </Link>
              <Link href="/espace/owner/admins" className="border border-white/15 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/65">
                Gestion des Admin
              </Link>
            </>
          )}
          <span className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/40">{role}</span>
        </div>
      </div>

      {/* Summary KPI grid - displays ONLY KPIs for authorized modules */}
      <div className="mt-12 grid gap-px bg-white/10 md:grid-cols-4">
        {(canViewCandidates || isOwner) && (
          <div className="bg-[#111] p-7">
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">Utilisateurs / Candidates</span>
            <p className="mt-6 font-serif text-4xl text-[#c7a15a]">{users.length}</p>
          </div>
        )}
        {(canManageCompanies || isOwner) && (
          <div className="bg-[#111] p-7">
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">Entreprises</span>
            <p className="mt-6 font-serif text-4xl text-[#c7a15a]">{companies.length}</p>
          </div>
        )}
        {(canManageJobs || isOwner) && (
          <div className="bg-[#111] p-7">
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">Offres Ouvertes</span>
            <p className="mt-6 font-serif text-4xl text-[#c7a15a]">{openJobs}</p>
          </div>
        )}
        {(canViewReporting || isOwner) && (
          <div className="bg-[#111] p-7">
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">Candidatures</span>
            <p className="mt-6 font-serif text-4xl text-[#c7a15a]">{applications.length}</p>
          </div>
        )}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
        {(canViewReporting || isOwner) && (
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
        )}

        {(canViewCandidates || isOwner) && (
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
        )}
      </div>

      {(canManageJobs || isOwner) && (
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
      )}
    </section>
  );
}
