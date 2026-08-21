"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireConsultantAccess } from "@/lib/consultant-access";
import { matchCandidateToJob } from "@/lib/matching";

const sourceSchema = z.object({
  source: z.string().trim().min(2).max(80),
  sourceProfileUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  name: z.string().trim().max(160).optional(),
  headline: z.string().trim().max(200).optional(),
  location: z.string().trim().max(160).optional(),
  skills: z.string().trim().max(2000).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  notes: z.string().trim().max(3000).optional(),
});

function optionalText(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return result || undefined;
}

function parseSkills(value?: string) {
  if (!value) return [];
  return value.split(",").map((skill) => skill.trim().toLowerCase()).filter(Boolean).slice(0, 40);
}

export async function createSourcedCandidate(formData: FormData) {
  const access = await requireConsultantAccess();
  const parsed = sourceSchema.safeParse({
    source: optionalText(formData.get("source")),
    sourceProfileUrl: optionalText(formData.get("sourceProfileUrl")),
    name: optionalText(formData.get("name")),
    headline: optionalText(formData.get("headline")),
    location: optionalText(formData.get("location")),
    skills: optionalText(formData.get("skills")),
    experienceYears: optionalText(formData.get("experienceYears")),
    notes: optionalText(formData.get("notes")),
  });
  if (!parsed.success) throw new Error("Les informations du profil sourcé sont invalides.");

  await prisma.sourcedCandidate.create({
    data: {
      source: parsed.data.source,
      sourceProfileUrl: parsed.data.sourceProfileUrl || undefined,
      name: parsed.data.name,
      headline: parsed.data.headline,
      location: parsed.data.location,
      skills: parseSkills(parsed.data.skills),
      experienceYears: parsed.data.experienceYears,
      notes: parsed.data.notes,
      createdByUserId: access.userId,
    },
  });
  revalidatePath("/espace/consultant");
}

async function runSourcedCandidateMatching(id: string, userId: string) {
  const candidate = await prisma.sourcedCandidate.findUnique({ where: { id } });
  if (!candidate || candidate.createdByUserId !== userId) throw new Error("Profil sourcé introuvable.");

  const jobs = await prisma.job.findMany({
    where: { status: "OPEN" },
    select: { id: true, title: true, description: true, requiredSkills: true, requiredExperienceYears: true, company: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const ranked = jobs.map((job) => {
    const matching = matchCandidateToJob(
      { headline: candidate.headline, bio: candidate.notes, skills: candidate.skills, experienceYears: candidate.experienceYears },
      job,
    );
    return { jobId: job.id, title: job.title, companyId: job.company.id, companyName: job.company.name, ...matching };
  }).sort((a, b) => b.score - a.score);

  const best = ranked[0];
  await prisma.sourcedCandidate.update({
    where: { id },
    data: {
      status: "MATCHED",
      matchingScore: best?.score ?? null,
      matchingDetails: best ? { bestMatch: best, topMatches: ranked.slice(0, 5) } : { bestMatch: null, topMatches: [] },
    },
  });
}

export async function updateSourcedCandidateStatus(id: string, status: "REVIEWING" | "MATCHED" | "VALIDATED" | "CONTACTED" | "REJECTED") {
  const access = await requireConsultantAccess();
  const existing = await prisma.sourcedCandidate.findUnique({ where: { id }, select: { id: true, createdByUserId: true } });
  if (!existing || existing.createdByUserId !== access.userId) throw new Error("Profil sourcé introuvable.");

  if (status === "MATCHED") {
    await runSourcedCandidateMatching(id, access.userId);
  } else {
    await prisma.sourcedCandidate.update({ where: { id }, data: { status } });
  }
  revalidatePath("/espace/consultant");
}
