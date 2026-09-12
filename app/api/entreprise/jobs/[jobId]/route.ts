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
  jobCategoryId: z.string().trim().optional(),
  subCategoryId: z.string().trim().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const existing = await prisma.job.findUnique({ where: { id: jobId }, select: { companyId: true } });
    if (!existing) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    const access = await requireCompanyAccess(existing.companyId);
    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId: access.companyId },
      select: {
        id: true,
        companyId: true,
        title: true,
        location: true,
        description: true,
        requiredSkills: true,
        requiredExperienceYears: true,
        attachmentName: true,
        attachmentMimeType: true,
        status: true,
        missionType: true,
        jobCategoryId: true,
        subCategoryId: true,
        createdAt: true,
        updatedAt: true,
        applications: {
          where: { presentations: { some: { companyId: access.companyId } } },
          select: {
            id: true,
            status: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            candidate: {
              select: {
                id: true,
                headline: true,
                bio: true,
                location: true,
                country: true,
                skills: true,
                experienceYears: true,
                user: { select: { name: true, email: true } },
                documents: { select: { id: true, name: true, type: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
        history: {
          select: {
            id: true,
            action: true,
            fromStatus: true,
            toStatus: true,
            createdAt: true,
            actor: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
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

    if (parsed.data.jobCategoryId) {
      const parentCat = await prisma.jobCategory.findUnique({
        where: { id: parsed.data.jobCategoryId },
        select: { id: true, isActive: true, parentId: true },
      });
      if (!parentCat || !parentCat.isActive || parentCat.parentId !== null) {
        return NextResponse.json({ error: "La catégorie métier sélectionnée est invalide ou inactive." }, { status: 400 });
      }
    }

    if (parsed.data.subCategoryId) {
      if (!parsed.data.jobCategoryId) {
        return NextResponse.json({ error: "Une sous-catégorie requiert une catégorie métier principale." }, { status: 400 });
      }
      const subCat = await prisma.jobCategory.findUnique({
        where: { id: parsed.data.subCategoryId },
        select: { id: true, isActive: true, parentId: true },
      });
      if (!subCat || !subCat.isActive || subCat.parentId !== parsed.data.jobCategoryId) {
        return NextResponse.json({ error: "La sous-catégorie sélectionnée ne correspond pas au métier principal." }, { status: 400 });
      }
    }

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
          ...(parsed.data.jobCategoryId !== undefined ? { jobCategoryId: parsed.data.jobCategoryId || null } : {}),
          ...(parsed.data.subCategoryId !== undefined ? { subCategoryId: parsed.data.subCategoryId || null } : {}),
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
