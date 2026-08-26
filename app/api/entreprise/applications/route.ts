import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";
import { isIdentityUnlocked } from "@/lib/mission-lock";

const querySchema = z.object({
  companyId: z.string().optional(),
  jobId: z.string().optional(),
  status: z.enum(["SUBMITTED", "REVIEWING", "INTERVIEW", "SHORTLISTED", "REJECTED", "HIRED"]).optional(),
  search: z.string().trim().max(120).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      companyId: url.searchParams.get("companyId") || undefined,
      jobId: url.searchParams.get("jobId") || undefined,
      status: url.searchParams.get("status") || undefined,
      search: url.searchParams.get("search") || undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: "Filtres invalides" }, { status: 400 });
    const access = await requireCompanyAccess(parsed.data.companyId);

    const applications = await prisma.application.findMany({
      where: {
        job: { companyId: access.companyId },
        ...(parsed.data.jobId ? { jobId: parsed.data.jobId } : {}),
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.search
          ? { candidate: { headline: { contains: parsed.data.search, mode: "insensitive" } } }
          : {}),
      },
      include: {
        job: true,
        candidate: { include: { user: true } },
        presentations: { where: { companyId: access.companyId }, orderBy: { presentedAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });

    const protectedApplications = applications.map((application) => {
      const presentation = application.presentations[0];
      const unlocked = Boolean(
        presentation && isIdentityUnlocked(presentation.state, presentation.financialConditionStatus),
      );

      return {
        id: application.id,
        status: application.status,
        notes: application.notes,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        job: application.job,
        presentation: presentation
          ? {
              id: presentation.id,
              state: presentation.state,
              financialConditionStatus: presentation.financialConditionStatus,
              presentedAt: presentation.presentedAt,
              unlocked,
            }
          : null,
        candidate: {
          id: application.candidate.id,
          headline: application.candidate.headline,
          bio: application.candidate.bio,
          location: application.candidate.location,
          country: application.candidate.country,
          skills: application.candidate.skills,
          experienceYears: application.candidate.experienceYears,
          ...(unlocked
            ? {
                name: application.candidate.user.name,
                email: application.candidate.user.email,
              }
            : {
                name: "Candidat présenté par Recrutement Privé",
                email: undefined,
              }),
        },
      };
    });

    return NextResponse.json(protectedApplications);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Accès refusé" }, { status: 403 });
  }
}
