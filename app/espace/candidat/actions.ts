"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { validateUploadedDocument } from "@/lib/security/file-validation";

const profileSchema = z.object({
  headline: z.string().trim().max(160).optional(), bio: z.string().trim().max(2000).optional(), location: z.string().trim().max(120).optional(), country: z.string().trim().max(120).optional(), phone: z.string().trim().max(40).optional(), phonePrefix: z.string().regex(/^\+\d{1,4}$/).default("+33"), cvUrl: z.string().trim().url().or(z.literal("")).optional(), preferences: z.string().trim().max(1000).optional(), skills: z.string().trim().max(1500).optional(), experienceYears: z.coerce.number().int().min(0).max(60).optional(),
});
function asOptional(value: FormDataEntryValue | null) { const text = String(value ?? "").trim(); return text || undefined; }
function csv(value: string | undefined) { return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : []; }

export async function saveCandidateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CANDIDAT") throw new Error("Accès refusé");
  const parsed = profileSchema.safeParse({
    headline: asOptional(formData.get("headline")), bio: asOptional(formData.get("bio")), location: asOptional(formData.get("location")), country: asOptional(formData.get("country")), phone: asOptional(formData.get("phone")), phonePrefix: String(formData.get("phonePrefix") ?? "+33"), cvUrl: String(formData.get("cvUrl") ?? "").trim(), preferences: asOptional(formData.get("preferences")), skills: asOptional(formData.get("skills")), experienceYears: asOptional(formData.get("experienceYears")),
  });
  if (!parsed.success) throw new Error("Données du profil invalides");
  const phone = parsed.data.phone ? (parsed.data.phone.startsWith("+") ? parsed.data.phone : `${parsed.data.phonePrefix} ${parsed.data.phone}`) : undefined;
  await prisma.candidateProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, headline: parsed.data.headline, bio: parsed.data.bio, location: parsed.data.location, country: parsed.data.country, phonePrefix: parsed.data.phonePrefix, phone, cvUrl: parsed.data.cvUrl || undefined, preferences: csv(parsed.data.preferences), skills: csv(parsed.data.skills), experienceYears: parsed.data.experienceYears },
    update: { headline: parsed.data.headline, bio: parsed.data.bio, location: parsed.data.location, country: parsed.data.country, phonePrefix: parsed.data.phonePrefix, phone: phone ?? null, cvUrl: parsed.data.cvUrl || null, preferences: csv(parsed.data.preferences), skills: csv(parsed.data.skills), experienceYears: parsed.data.experienceYears ?? null },
  });
  revalidatePath("/espace/candidat");
}

export async function deleteCandidateDocument(documentId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CANDIDAT") throw new Error("Accès refusé");
  const profile = await prisma.candidateProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) throw new Error("Profil non trouvé");

  const doc = await prisma.candidateDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.candidateId !== profile.id) throw new Error("Document non trouvé ou non autorisé");

  await prisma.candidateDocument.delete({ where: { id: documentId } });
  revalidatePath("/espace/candidat");
}

export async function uploadCandidateDocument(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CANDIDAT") throw new Error("Accès refusé");

  const file = formData.get("document");
  const docName = String(formData.get("name") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) throw new Error("Veuillez sélectionner un fichier valide");

  const validation = await validateUploadedDocument(file);
  if (!validation.ok) throw new Error(validation.error);

  let profile = await prisma.candidateProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) {
    profile = await prisma.candidateProfile.create({ data: { userId: session.user.id } });
  }

  const name = docName || file.name;
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/pdf";

  await prisma.candidateDocument.create({
    data: {
      candidateId: profile.id,
      name: name.slice(0, 180),
      fileData: buffer,
      type: mimeType,
    },
  });

  revalidatePath("/espace/candidat");
}

export async function applyToJob(jobId: string, notes?: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || session.user.role !== "CANDIDAT") {
    throw new Error("Vous devez être connecté en tant que candidat pour postuler.");
  }

  const job = await prisma.job.findFirst({
    where: { id: jobId, status: "OPEN" },
  });
  if (!job) {
    throw new Error("L'offre d'emploi n'est plus ouverte aux candidatures.");
  }

  let profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.candidateProfile.create({ data: { userId } });
  }

  const existingApp = await prisma.application.findUnique({
    where: { candidateId_jobId: { candidateId: profile.id, jobId } },
  });

  if (existingApp) {
    throw new Error("Vous avez déjà postulé à cette offre d'emploi.");
  }

  const application = await prisma.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        candidateId: profile.id,
        userId,
        jobId,
        status: "SUBMITTED",
        notes: notes ? notes.trim().slice(0, 1000) : null,
      },
    });

    await tx.recruitmentHistory.create({
      data: {
        applicationId: app.id,
        jobId,
        actorUserId: userId,
        action: "APPLICATION_SUBMITTED",
        toStatus: "SUBMITTED",
        details: { source: "CANDIDAT_PORTAL" },
      },
    });

    return app;
  });

  revalidatePath("/espace/candidat");
  revalidatePath(`/offres/${jobId}`);
  return application;
}
