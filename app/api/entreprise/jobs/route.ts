import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";

const jobSchema = z.object({
  title: z.string().trim().min(2).max(160),
  location: z.string().trim().max(160).optional(),
  description: z.string().trim().max(10000).optional(),
  status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "ARCHIVED"]).default("DRAFT"),
});

export async function GET(request: Request) {
  try {
    const companyId = new URL(request.url).searchParams.get("companyId") ?? undefined;
    const access = await requireCompanyAccess(companyId);
    const jobs = await prisma.job.findMany({
      where: { companyId: access.companyId },
      include: { _count: { select: { applications: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(jobs);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Accès refusé" }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const access = await requireCompanyAccess(body?.companyId);
    const parsed = jobSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Données d'offre invalides" }, { status: 400 });

    const job = await prisma.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: {
          companyId: access.companyId,
          title: parsed.data.title,
          location: parsed.data.location || null,
          description: parsed.data.description || null,
          status: parsed.data.status,
        },
      });

      await tx.recruitmentHistory.create({
        data: {
          jobId: created.id,
          actorUserId: access.userId,
          action: "JOB_CREATED",
          toStatus: created.status,
        },
      });
      return created;
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible de créer l'offre" }, { status: 403 });
  }
}
