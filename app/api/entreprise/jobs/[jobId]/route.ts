import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isCompanyManager, requireCompanyAccess } from "@/lib/company-access";

const jobSchema = z.object({
  title: z.string().trim().min(2).max(160),
  location: z.string().trim().max(160).optional(),
  description: z.string().trim().max(10000).optional(),
  missionType: z.string().trim().max(100).optional(),
  requiredSkills: z.union([z.string(), z.array(z.string())]).optional(),
  requiredExperienceYears: z.coerce.number().int().min(0).max(60).optional(),
  status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "ARCHIVED"]),
});

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const existing = await prisma.job.findUnique({ where: { id: jobId }, select: { companyId: true } });
    if (!existing) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    const access = await requireCompanyAccess(existing.companyId);
    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId: access.companyId },
      include: {
        applications: {
          where: { presentations: { some: { companyId: access.companyId } } },
          include: { candidate: { include: { user: true, documents: true } } },
          orderBy: { updatedAt: "desc" },
        },
        history: { include: { actor: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!job) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Accès refusé" }, { status: 403 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const existing = await prisma.job.findUnique({ where: { id: jobId }, select: { companyId: true, status: true } });
    if (!existing) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    const access = await requireCompanyAccess(existing.companyId);
    const parsed = jobSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Données d'offre invalides" }, { status: 400 });

    const skills = typeof parsed.data.requiredSkills === "string"
      ? parsed.data.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean)
      : parsed.data.requiredSkills ?? undefined;

    const job = await prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id: jobId },
        data: {
          title: parsed.data.title,
          location: parsed.data.location || null,
          description: parsed.data.description || null,
          missionType: parsed.data.missionType || null,
          ...(skills !== undefined ? { requiredSkills: skills } : {}),
          ...(parsed.data.requiredExperienceYears !== undefined ? { requiredExperienceYears: parsed.data.requiredExperienceYears } : {}),
          status: parsed.data.status,
        },
      });
      if (updated.status !== existing.status) {
        await tx.recruitmentHistory.create({
          data: {
            jobId,
            actorUserId: access.userId,
            action: "JOB_STATUS_CHANGED",
            fromStatus: existing.status,
            toStatus: updated.status,
          },
        });
      } else {
        await tx.recruitmentHistory.create({ data: { jobId, actorUserId: access.userId, action: "JOB_UPDATED" } });
      }
      return updated;
    });

    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible de modifier l'offre" }, { status: 403 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const existing = await prisma.job.findUnique({ where: { id: jobId }, select: { companyId: true, status: true } });
    if (!existing) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    const access = await requireCompanyAccess(existing.companyId);
    if (!isCompanyManager(access.memberRole)) return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });

    await prisma.job.update({ where: { id: jobId }, data: { status: "ARCHIVED" } });
    await prisma.recruitmentHistory.create({
      data: {
        jobId,
        actorUserId: access.userId,
        action: "JOB_ARCHIVED",
        fromStatus: existing.status,
        toStatus: "ARCHIVED",
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible d'archiver l'offre" }, { status: 403 });
  }
}
