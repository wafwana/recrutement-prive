import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";
import { isIdentityUnlocked } from "@/lib/mission-lock";
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

  const sourcingSetting = await prisma.systemSetting.findUnique({ where: { key: `sourcing:countries:${access.companyId}` }, select: { value: true } });
  const sourcingCountries = sourcingSetting?.value && Array.isArray(sourcingSetting.value)
    ? sourcingSetting.value.filter((value): value is string => typeof value === "string")
    : [];

  const jobs = await prisma.job.findMany({
    where: { companyId: access.companyId },
    select: { id: true, title: true, location: true, status: true, attachmentName: true, applications: { select: { status: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const categories = await prisma.jobCategory.findMany({\n    where: { isActive: true },\n    select: { id: true, code: true, name: true, parentId: true, sortOrder: true },\n    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],\n  });\n\n  const rawApplications = await prisma.application.findMany({
    where: {
      job: { companyId: access.companyId },
      presentations: { some: { companyId: access.companyId } },
    },
    include: {\n      job: { select: { id: true, title: true } },\n      presentations: { where: { companyId: access.companyId }, orderBy: { presentedAt: "desc" }, take: 1 },\n    },\n    orderBy: { updatedAt: "desc" },
  });

  const applications = rawApplications.map((app) => ({
    id: app.id,
    status: app.status,
    job: app.job,
  }));
