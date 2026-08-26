import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";
import CompanyDashboard from "./CompanyDashboard";

export default async function EntreprisePage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ENTREPRISE") return null;

  const { companyId } = await searchParams;
  const membershipCount = await prisma.companyMember.count({ where: { userId: session.user.id } });

  if (membershipCount === 0) {
    return (
      <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-16 md:w-[min(1180px,calc(100%-72px))] md:py-24">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace entreprise</p>
        <h1 className="mt-5 font-serif text-5xl sm:text-6xl">Compte entreprise à configurer.</h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-white/50">Votre compte est authentifié, mais aucune entreprise ne lui est encore associée.</p>
      </section>
    );
  }

  if (membershipCount > 1 && !companyId) {
    const memberships = await prisma.companyMember.findMany({ where: { userId: session.user.id }, include: { company: true }, orderBy: { createdAt: "asc" } });
    return (
      <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-16 md:w-[min(1180px,calc(100%-72px))] md:py-24">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace entreprise</p>
        <h1 className="mt-5 font-serif text-5xl sm:text-6xl">Sélectionnez votre entreprise.</h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-white/50">Votre compte appartient à plusieurs entreprises. Sélectionnez le contexte de travail avant d'accéder aux offres et candidatures.</p>
        <div className="mt-8 space-y-2">{memberships.map((membership) => <a key={membership.companyId} href={`/espace/entreprise?companyId=${encodeURIComponent(membership.companyId)}`} className="block border border-white/10 p-5 transition hover:border-[#c7a15a]/40"><span className="font-serif text-xl">{membership.company.name}</span><span className="ml-3 text-[10px] uppercase tracking-[0.16em] text-white/35">{membership.role}</span></a>)}</div>
      </section>
    );
  }

  const access = await requireCompanyAccess(companyId);
  const membership = await prisma.companyMember.findUnique({ where: { companyId_userId: { companyId: access.companyId, userId: session.user.id } }, include: { company: true } });
  if (!membership) return null;

  const jobs = await prisma.job.findMany({
    where: { companyId: access.companyId },
    select: { id: true, title: true, location: true, status: true, attachmentName: true, applications: { select: { status: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const applications = await prisma.application.findMany({
    where: { job: { companyId: access.companyId } },
    include: { job: { select: { id: true, title: true } }, candidate: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-16 md:w-[min(1180px,calc(100%-72px))] md:py-24">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace entreprise</p>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="font-serif text-5xl sm:text-6xl">Vos recrutements, clairement pilotés.</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-white/50">{membership.company.name} · gérez vos offres, suivez les candidatures et pilotez votre pipeline.</p></div><p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Rôle {membership.role}</p></div>
      <section className="mt-10 grid gap-6 border border-[#c7a15a]/20 bg-[#111] p-8 md:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Notre engagement</p>
          <p className="mt-4 text-sm leading-7 text-white/70">Recrutement Privé ne vend pas les coordonnées d'un candidat. Recrutement Privé organise une mise en relation qualifiée, après validation de l'intérêt du candidat et sécurisation des conditions financières de la mission.</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Processus de mise en relation</p>
          <p className="mt-4 text-sm leading-7 text-white/70">Après confirmation de l'intérêt réciproque pour la mission, les conditions financières applicables sont sécurisées avant la mise en relation directe.</p>
        </div>
      </section>
      <CompanyDashboard jobs={jobs} applications={applications} companyId={access.companyId} />
    </section>
  );
}
