import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";

const querySchema = z.object({
  companyId: z.string().optional(),
  jobId: z.string().optional(),
  status: z.enum(["SHORTLISTED", "INTERVIEW", "REJECTED", "HIRED"]).optional(),
  search: z.string().trim().max(120).optional(),
});

const companyVisibleStatuses = ["SHORTLISTED", "INTERVIEW", "REJECTED", "HIRED"] as const;

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
        status: parsed.data.status ? parsed.data.status : { in: companyVisibleStatuses },
        ...(parsed.data.jobId ? { jobId: parsed.data.jobId } : {}),
        ...(parsed.data.search
          ? {
              OR: [
                { candidate: { user: { name: { contains: parsed.data.search, mode: "insensitive" } } } },
                { candidate: { user: { email: { contains: parsed.data.search, mode: "insensitive" } } } },
                { candidate: { headline: { contains: parsed.data.search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        job: true,
        candidate: { include: { user: true, documents: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Accès refusé" }, { status: 403 });
  }
}
