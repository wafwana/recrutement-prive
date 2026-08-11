import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";

const bodySchema = z.object({
  status: z.enum(["SUBMITTED", "REVIEWING", "INTERVIEW", "SHORTLISTED", "REJECTED", "HIRED"]),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    const { applicationId } = await params;
    const existing = await prisma.application.findUnique({ where: { id: applicationId }, select: { job: { select: { companyId: true } } } });
    if (!existing) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
    const access = await requireCompanyAccess(existing.job.companyId);
    const application = await prisma.application.findFirst({
      where: { id: applicationId, job: { companyId: access.companyId } },
      include: {
        job: true,
        candidate: { include: { user: true, documents: true } },
        history: { include: { actor: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!application) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
    return NextResponse.json(application);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Accès refusé" }, { status: 403 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    const { applicationId } = await params;
    const existing = await prisma.application.findUnique({ where: { id: applicationId }, select: { jobId: true, status: true, job: { select: { companyId: true } } } });
    if (!existing) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
    const access = await requireCompanyAccess(existing.job.companyId);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Mise à jour invalide" }, { status: 400 });

    const application = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: parsed.data.status,
          ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        },
      });
      await tx.recruitmentHistory.create({
        data: {
          applicationId,
          jobId: existing.jobId,
          actorUserId: access.userId,
          action: existing.status === parsed.data.status ? "APPLICATION_UPDATED" : "APPLICATION_STATUS_CHANGED",
          fromStatus: existing.status,
          toStatus: parsed.data.status,
          details: parsed.data.notes !== undefined ? { notesUpdated: true } : undefined,
        },
      });
      return updated;
    });

    return NextResponse.json(application);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible de modifier la candidature" }, { status: 403 });
  }
}
