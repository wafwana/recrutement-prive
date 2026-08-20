import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import CompanyDashboard from "../CompanyDashboard";

export default async function CompanyScopedPage({ params }: { params: Promise<{ companyId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ENTREPRISE") redirect("/connexion");
  const { companyId } = await params;

  const membership = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId: session.user.id } },
    include: { company: true },
  });
  if (!membership) notFound();

  const jobs = await prisma.job.findMany({
    where: { companyId },
    include: { applications: { select: { status: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const applications = await prisma.application.findMany({
    where: { job: { companyId } },
    include: {
      job: { select: { id: true, title: true } },
      candidate: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-16 md:w-[min(1180px,calc(100%-72px))] md:py-24">
      <Link href="/espace/entreprise" className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">← Entreprises</Link>
      <p className="mt-8 text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace entreprise</p>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-5xl sm:text-6xl">Vos recrutements, clairement pilotés.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/50">{membership.company.name} · gérez vos offres, suivez les candidatures et pilotez votre pipeline.</p>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Rôle {membership.role}</p>
      </div>
      <CompanyDashboard jobs={jobs} applications={applications} companyId={companyId} />
    </section>
  );
}
