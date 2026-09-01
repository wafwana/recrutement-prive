"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);

const jobSchema = z.object({ companyId: z.string().optional(), title: z.string().trim().min(2).max(160), location: z.string().trim().max(160).optional(), description: z.string().trim().max(10000).optional(), missionType: z.string().trim().max(100).optional(), requiredSkills: z.string().trim().max(1500).optional(), requiredExperienceYears: z.coerce.number().int().min(0).max(60).optional(), status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "ARCHIVED"]).default("DRAFT") });
const updateJobSchema = z.object({ companyId: z.string().optional(), jobId: z.string().min(1), title: z.string().trim().min(2).max(160), location: z.string().trim().max(160).optional(), description: z.string().trim().max(10000).optional(), missionType: z.string().trim().max(100).optional(), requiredSkills: z.string().trim().max(1500).optional(), requiredExperienceYears: z.coerce.number().int().min(0).max(60).optional(), status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "ARCHIVED"]) });
const companyProfileSchema = z.object({ companyId: z.string().optional(), name: z.string().trim().min(2).max(180).optional(), description: z.string().trim().max(2000).optional(), website: z.string().trim().url().or(z.literal("")).optional(), country: z.string().trim().min(2).max(120).optional(), phonePrefix: z.string().trim().max(12).optional(), phone: z.string().trim().max(40).optional() });
function text(value: FormDataEntryValue | null) { const result = String(value ?? "").trim(); return result || undefined; }
function csv(value: string | undefined) { return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : []; }

function getAttachment(formData: FormData) {
  const value = formData.get("attachment");
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > MAX_ATTACHMENT_SIZE) throw new Error("La pièce jointe dépasse la taille maximale de 10 Mo.");
  const name = value.name.trim();
  const extension = name.toLowerCase().slice(name.lastIndexOf("."));
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension) || (value.type && !ALLOWED_ATTACHMENT_TYPES.has(value.type))) {
    throw new Error("Format de pièce jointe non autorisé. Utilisez un fichier PDF, DOC ou DOCX.");
  }
  return value;
}

export async function updateCompanyProfile(formData: FormData) {
  const parsed = companyProfileSchema.safeParse({
    companyId: text(formData.get("companyId")),
    name: text(formData.get("name")),
    description: text(formData.get("description")),
    website: text(formData.get("website")),
    country: text(formData.get("country")),
    phonePrefix: text(formData.get("phonePrefix")),
    phone: text(formData.get("phone")),
  });
  if (!parsed.success) throw new Error("Les informations d'entreprise sont invalides.");
  const access = await requireCompanyAccess(parsed.data.companyId);
  await prisma.company.update({
    where: { id: access.companyId },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
      ...(parsed.data.website !== undefined ? { website: parsed.data.website || null } : {}),
      ...(parsed.data.country ? { country: parsed.data.country } : {}),
      ...(parsed.data.phonePrefix ? { phonePrefix: parsed.data.phonePrefix } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {}),
    },
  });
  revalidatePath("/espace/entreprise");
}

export async function updateCompanyContact(formData: FormData) {
  return updateCompanyProfile(formData);
}

export async function createCompanyJob(formData: FormData) {
  const parsed = jobSchema.safeParse({ companyId: text(formData.get("companyId")), title: text(formData.get("title")), location: text(formData.get("location")), description: text(formData.get("description")), missionType: text(formData.get("missionType")), requiredSkills: text(formData.get("requiredSkills")), requiredExperienceYears: text(formData.get("requiredExperienceYears")), status: text(formData.get("status")) ?? "DRAFT" });
  if (!parsed.success) throw new Error("Les données de l'offre sont invalides.");
  const access = await requireCompanyAccess(parsed.data.companyId);
  const attachment = getAttachment(formData);
  const attachmentData = attachment ? Buffer.from(await attachment.arrayBuffer()) : undefined;
  await prisma.$transaction(async (tx) => {
    const job = await tx.job.create({ data: { companyId: access.companyId, title: parsed.data.title, location: parsed.data.location, description: parsed.data.description, missionType: parsed.data.missionType, requiredSkills: csv(parsed.data.requiredSkills), requiredExperienceYears: parsed.data.requiredExperienceYears, ...(attachment ? { attachmentName: attachment.name, attachmentMimeType: attachment.type || "application/octet-stream", attachmentData } : {}), status: parsed.data.status } });
    await tx.recruitmentHistory.create({ data: { jobId: job.id, actorUserId: access.userId, action: "JOB_CREATED", toStatus: job.status, details: attachment ? { attachmentName: attachment.name, attachmentSize: attachment.size } : undefined } });
  });
  revalidatePath("/espace/entreprise");
}

export async function updateCompanyJob(formData: FormData) {
  const parsed = updateJobSchema.safeParse({
    companyId: text(formData.get("companyId")),
    jobId: text(formData.get("jobId")),
    title: text(formData.get("title")),
    location: text(formData.get("location")),
    description: text(formData.get("description")),
    missionType: text(formData.get("missionType")),
    requiredSkills: text(formData.get("requiredSkills")),
    requiredExperienceYears: text(formData.get("requiredExperienceYears")),
    status: text(formData.get("status")),
  });
  if (!parsed.success) throw new Error("Les données de la mission sont invalides.");
  const access = await requireCompanyAccess(parsed.data.companyId);

  const existing = await prisma.job.findFirst({
    where: { id: parsed.data.jobId, companyId: access.companyId },
  });
  if (!existing) throw new Error("Mission introuvable.");

  await prisma.$transaction(async (tx) => {
    const updated = await tx.job.update({
      where: { id: parsed.data.jobId },
      data: {
        title: parsed.data.title,
        location: parsed.data.location || null,
        description: parsed.data.description || null,
        missionType: parsed.data.missionType || null,
        requiredSkills: csv(parsed.data.requiredSkills),
        requiredExperienceYears: parsed.data.requiredExperienceYears ?? null,
        status: parsed.data.status,
      },
    });

    if (existing.status !== updated.status) {
      await tx.recruitmentHistory.create({
        data: {
          jobId: updated.id,
          actorUserId: access.userId,
          action: "JOB_STATUS_CHANGED",
          fromStatus: existing.status,
          toStatus: updated.status,
        },
      });
    } else {
      await tx.recruitmentHistory.create({
        data: {
          jobId: updated.id,
          actorUserId: access.userId,
          action: "JOB_UPDATED",
        },
      });
    }
  });

  revalidatePath("/espace/entreprise");
  revalidatePath(`/espace/entreprise/offres/${parsed.data.jobId}`);
}

export async function updateApplicationStatus(applicationId: string, status: string, notes?: string) {
  const existing = await prisma.application.findUnique({ where: { id: applicationId }, select: { jobId: true, status: true, job: { select: { companyId: true } } } });
  if (!existing) throw new Error("Candidature introuvable.");
  const access = await requireCompanyAccess(existing.job.companyId);

  const presentation = await prisma.missionPresentation.findFirst({
    where: { applicationId, companyId: access.companyId },
  });
  if (!presentation) {
    throw new Error("Cette candidature n'a pas été présentée à votre entreprise.");
  }

  const parsedStatus = z.enum(["SUBMITTED", "REVIEWING", "INTERVIEW", "SHORTLISTED", "REJECTED", "HIRED"]).safeParse(status);
  if (!parsedStatus.success) throw new Error("Statut invalide.");
  await prisma.$transaction(async (tx) => { await tx.application.update({ where: { id: applicationId }, data: { status: parsedStatus.data, ...(notes !== undefined ? { notes: notes.trim().slice(0, 5000) || null } : {}) } }); await tx.recruitmentHistory.create({ data: { applicationId, jobId: existing.jobId, actorUserId: access.userId, action: "APPLICATION_STATUS_CHANGED", fromStatus: existing.status, toStatus: parsedStatus.data } }); });
  revalidatePath("/espace/entreprise"); revalidatePath(`/espace/entreprise/offres/${existing.jobId}`);
}
