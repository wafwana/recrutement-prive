"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";

const jobSchema = z.object({
  companyId: z.string().optional(),
  title: z.string().trim().min(2).max(160),
  location: z.string().trim().max(160).optional(),
  description: z.string().trim().max(10000).optional(),
  status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "ARCHIVED"]).default("DRAFT"),
});

function text(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return result || undefined;
}

export async function createCompanyJob(formData: FormData) {
  const parsed = jobSchema.safeParse({
    companyId: text(formData.get("companyId")),
    title: text(formData.get("title")),
    location: text(formData.get("location")),
    description: text(formData.get("description")),
    status: text(formData.get("status")) ?? "DRAFT",
  });
  if (!parsed.success) throw new Error("Les données de l'offre sont invalides.");

  const access = await requireCompanyAccess(parsed.data.companyId);
  await prisma.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        companyId: access.companyId,
        title: parsed.data.title,
        location: parsed.data.location,
        description: parsed.data.description,
        status: parsed.data.status,
      },
    });
    await tx.recruitmentHistory.create({
      data: {
        jobId: job.id,
        actorUserId: access.userId,
        action: "JOB_CREATED",
        toStatus: job.status,
      },
    });
  });

  revalidatePath("/espace/entreprise");
}

export async function updateApplicationStatus(applicationId: string, status: string, notes?: string) {
  const existing = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { jobId: true, status: true, job: { select: { companyId: true } } },
  });
  if (!existing) throw new Error("Candidature introuvable.");

  const access = await requireCompanyAccess(existing.job.companyId);
  const parsedStatus = z.enum(["SUBMITTED", "REVIEWING", "INTERVIEW", "SHORTLISTED", "REJECTED", "HIRED"]).safeParse(status);
  if (!parsedStatus.success) throw new Error("Statut invalide.");

  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: parsedStatus.data,
        ...(notes !== undefined ? { notes: notes.trim().slice(0, 5000) || null } : {}),
      },
    });
    await tx.recruitmentHistory.create({
      data: {
        applicationId,
        jobId: existing.jobId,
        actorUserId: access.userId,
        action: "APPLICATION_STATUS_CHANGED",
        fromStatus: existing.status,
        toStatus: parsedStatus.data,
      },
    });
  });

  revalidatePath("/espace/entreprise");
  revalidatePath(`/espace/entreprise/offres/${existing.jobId}`);
}
