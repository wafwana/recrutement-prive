import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";
import CompanyTechWorkspace from "./CompanyTechWorkspace";

export default async function CompanyTechPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ENTREPRISE") redirect("/connexion");
  const { companyId } = await searchParams;
  let access;
  try { access = await requireCompanyAccess(companyId); }
  catch { redirect("/espace/entreprise"); }

  const allProspects = await prisma.techProspect.findMany({
    where: { leadSource: "POLE_1_COMPANY_CLIENT" },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, projectNeed: true, notes: true, status: true, createdAt: true, detectionSignals: true },
  });
  const ownProspects = allProspects.filter((item) => {
    const signals = item.detectionSignals && typeof item.detectionSignals === "object" && !Array.isArray(item.detectionSignals)
      ? item.detectionSignals as Record<string, unknown> : {};
    return signals.sourceCompanyId === access.companyId;
  });
  const prospectIds = ownProspects.map((item) => item.id);
  const projectRows = prospectIds.length ? await prisma.techProject.findMany({
    where: { techProspectId: { in: prospectIds } },
    orderBy: { updatedAt: "desc" },
    include: { proposal: { select: { title: true, status: true } }, milestones: { orderBy: { dueAt: "asc" }, select: { id: true, title: true, status: true, dueAt: true } } },
  }) : [];
  const projects = projectRows.map((project) => ({
    id: project.id, reference: project.reference, name: project.name, status: project.status,
    description: project.description, proposal: project.proposal,
    milestones: project.milestones.map((m) => ({ ...m, dueAt: m.dueAt?.toISOString() ?? null })),
  }));
  return <main className="min-h-screen bg-[#081625] px-5 py-10 text-[#F8FAFC] sm:px-8"><CompanyTechWorkspace companyId={access.companyId} requests={ownProspects.map((item) => ({ id: item.id, projectNeed: item.projectNeed, notes: item.notes, status: item.status, createdAt: item.createdAt.toISOString() }))} projects={projects}/></main>;
}
