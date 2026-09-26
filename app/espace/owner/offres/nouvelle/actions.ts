"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { analyzeAndMatchJob } from "@/lib/jobs/automation";

const schema = z.object({
  companyId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  location: z.string().trim().max(160).optional(),
  description: z.string().trim().max(10000).optional(),
  missionType: z.string().trim().max(100).optional(),
  requiredSkills: z.string().trim().max(1500).optional(),
  requiredExperienceYears: z.coerce.number().int().min(0).max(60).optional(),
  jobCategoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "ARCHIVED"]).default("DRAFT"),
});

async function requireOwner() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") throw new Error("Accès réservé à l'OWNER.");
  return session.user.id;
}

export async function createOwnerJob(formData: FormData) {
  const actorUserId = await requireOwner();
  const experienceRaw = String(formData.get("requiredExperienceYears") ?? "").trim();
  const parsed = schema.safeParse({
    companyId: String(formData.get("companyId") ?? ""),
    title: String(formData.get("title") ?? ""),
    location: String(formData.get("location") ?? ""),
    description: String(formData.get("description") ?? ""),
    missionType: String(formData.get("missionType") ?? ""),
    requiredSkills: String(formData.get("requiredSkills") ?? ""),
    requiredExperienceYears: experienceRaw ? experienceRaw : undefined,
    jobCategoryId: String(formData.get("jobCategoryId") ?? ""),
    subCategoryId: String(formData.get("subCategoryId") ?? ""),
    status: String(formData.get("status") ?? "DRAFT"),
  });
  if (!parsed.success) throw new Error("Les données de l'offre sont invalides.");

  const company = await prisma.company.findUnique({ where: { id: parsed.data.companyId }, select: { id: true, name: true } });
  if (!company) throw new Error("Entreprise introuvable.");

  let categoryId = parsed.data.jobCategoryId || null;
  const subCategoryId = parsed.data.subCategoryId || null;

  if (categoryId) {
    const category = await prisma.jobCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, parentId: true, isActive: true },
    });
    if (!category || !category.isActive || category.parentId !== null) throw new Error("La catégorie métier principale est invalide.");
  }

  if (subCategoryId) {
    if (!categoryId) throw new Error("Une sous-catégorie requiert une catégorie métier principale.");
    const subCategory = await prisma.jobCategory.findUnique({
      where: { id: subCategoryId },
      select: { id: true, parentId: true, isActive: true },
    });
    if (!subCategory || !subCategory.isActive || subCategory.parentId !== categoryId) throw new Error("La sous-catégorie métier est invalide.");
  }

  const skills = (parsed.data.requiredSkills || "").split(",").map((value) => value.trim()).filter(Boolean);

  const job = await prisma.$transaction(async (tx) => {
    const created = await tx.job.create({
      data: {
        companyId: company.id,
        title: parsed.data.title,
        location: parsed.data.location || null,
        description: parsed.data.description || null,
        missionType: parsed.data.missionType || null,
        requiredSkills: skills,
        requiredExperienceYears: parsed.data.requiredExperienceYears,
        jobCategoryId: categoryId,
        subCategoryId,
        status: parsed.data.status,
      },
    });
    await tx.recruitmentHistory.create({
      data: {
        jobId: created.id,
        actorUserId,
        action: "JOB_CREATED_MANUALLY",
        toStatus: created.status,
        details: { source: "OWNER_MANUAL_ENTRY", companyId: company.id },
      },
    });
    return created;
  });

  await prisma.auditLog.create({
    data: {
      actorUserId,
      actorRole: "OWNER",
      action: "JOB_CREATED_MANUALLY",
      targetType: "Job",
      targetId: job.id,
      details: { companyId: company.id, title: job.title, status: job.status, source: "OWNER_MANUAL_ENTRY" },
    },
  });

  const automation = await analyzeAndMatchJob({
    jobId: job.id,
    actorUserId,
    actorRole: "OWNER",
  });

  return {
    ok: true,
    jobId: job.id,
    companyName: company.name,
    aiEnabled: automation.aiEnabled,
    matchCount: automation.matchCount,
  };
}
