"use server";

import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { validateUploadedDocument } from "@/lib/security/file-validation";
import { requireFileScanInProduction, scanBufferWithClamAV } from "@/lib/security/file-scan";
import { applyCandidateToJob } from "@/lib/candidate-application";
import { analyzeCvDocument } from "@/lib/cv/analyzer";

const profileSchema = z.object({
  headline: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  phonePrefix: z.string().regex(/^\+\d{1,4}$/).default("+33"),
  preferences: z.string().trim().max(1000).optional(),
  skills: z.string().trim().max(1500).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  primaryCategoryId: z.string().trim().optional(),
});

function asOptional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}
function csv(value: string | undefined) {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

export async function saveCandidateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CANDIDAT") throw new Error("Accès refusé");

  const parsed = profileSchema.safeParse({
    headline: asOptional(formData.get("headline")),
    bio: asOptional(formData.get("bio")),
    location: asOptional(formData.get("location")),
    country: asOptional(formData.get("country")),
    phone: asOptional(formData.get("phone")),
    phonePrefix: String(formData.get("phonePrefix") ?? "+33"),
    preferences: asOptional(formData.get("preferences")),
    skills: asOptional(formData.get("skills")),
    experienceYears: asOptional(formData.get("experienceYears")),
    primaryCategoryId: asOptional(formData.get("primaryCategoryId")),
  });

  if (!parsed.success) throw new Error("Données du profil invalides");

  const subCategoryIds = formData.getAll("subCategoryIds").map(String).filter(Boolean);

  if (parsed.data.primaryCategoryId) {
    const parentCat = await prisma.jobCategory.findUnique({
      where: { id: parsed.data.primaryCategoryId },
      select: { id: true, isActive: true, parentId: true },
    });
    if (!parentCat || !parentCat.isActive || parentCat.parentId !== null) {
      throw new Error("La catégorie métier sélectionnée est invalide ou inactive.");
    }
  }

  if (subCategoryIds.length > 0) {
    if (!parsed.data.primaryCategoryId) {
      throw new Error("Sélectionner des sous-catégories requiert une catégorie principale.");
    }
    const validSubCats = await prisma.jobCategory.findMany({
      where: {
        id: { in: subCategoryIds },
        isActive: true,
        parentId: parsed.data.primaryCategoryId,
      },
      select: { id: true },
    });
    if (validSubCats.length !== subCategoryIds.length) {
      throw new Error("Une ou plusieurs sous-catégories sélectionnées sont invalides.");
    }
  }

  const phone = parsed.data.phone
    ? (parsed.data.phone.startsWith("+") ? parsed.data.phone : `${parsed.data.phonePrefix} ${parsed.data.phone}`)
    : undefined;

  await prisma.candidateProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      headline: parsed.data.headline,
      bio: parsed.data.bio,
      location: parsed.data.location,
      country: parsed.data.country,
      phonePrefix: parsed.data.phonePrefix,
      phone,
      preferences: csv(parsed.data.preferences),
      skills: csv(parsed.data.skills),
      experienceYears: parsed.data.experienceYears,
      primaryCategoryId: parsed.data.primaryCategoryId || undefined,
      subCategoryIds: subCategoryIds.length ? subCategoryIds : [],
    },
    update: {
      headline: parsed.data.headline,
      bio: parsed.data.bio,
      location: parsed.data.location,
      country: parsed.data.country,
      phonePrefix: parsed.data.phonePrefix,
      phone: phone ?? null,
      preferences: csv(parsed.data.preferences),
      skills: csv(parsed.data.skills),
      experienceYears: parsed.data.experienceYears ?? null,
      primaryCategoryId: parsed.data.primaryCategoryId || null,
      subCategoryIds: subCategoryIds.length ? subCategoryIds : [],
    },
  });

  try { revalidatePath("/espace/candidat"); } catch { /* test context */ }
}

export async function deleteCandidateDocument(documentId: string) {
  let session = getActiveSessionContext();
  if (!session) {
    try { session = await auth(); } catch { /* test context */ }
  }
  if (!session?.user?.id || session.user.role !== "CANDIDAT") throw new Error("Accès refusé");
  const profile = await prisma.candidateProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) throw new Error("Profil non trouvé");

  const doc = await prisma.candidateDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.candidateId !== profile.id) throw new Error("Document non trouvé ou non autorisé");

  await prisma.candidateDocument.delete({ where: { id: documentId } });
  try { revalidatePath("/espace/candidat"); } catch { /* test context */ }
}

export async function uploadCandidateDocument(formData: FormData) {
  let session = getActiveSessionContext();
  if (!session) {
    try { session = await auth(); } catch { /* test context */ }
  }
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

  if (requireFileScanInProduction()) {
    const scan = await scanBufferWithClamAV(buffer);
    if (scan.status === "infected") throw new Error("Le document a été bloqué par le contrôle de sécurité.");
    if (scan.status === "unavailable") {
      console.error("[uploadCandidateDocument] antivirus unavailable", scan.reason);
      throw new Error("Le contrôle de sécurité des documents est temporairement indisponible.");
    }
  }

  const mimeType = file.type || "application/pdf";
  const isCv = /(^|[\\s_-])(cv|resume|curriculum|vitae)([\\s_.-]|$)/i.test(name) || /(^|[\\s_-])(cv|resume|curriculum|vitae)([\\s_.-]|$)/i.test(file.name);

  let docType = isCv ? "CV" : "AUTRE";
  let folderPath = isCv ? "CANDIDATS/A_CLASSER/A_VERIFIER/CV" : "CANDIDATS/A_CLASSER/A_VERIFIER";
  let analysis: Awaited<ReturnType<typeof analyzeCvDocument>> = null;
  let analyzedAt: Date | undefined;
  let isPrimaryCv = false;

  if (isCv) {
    const taxonomyRows = await prisma.jobCategory.findMany({
      where: { isActive: true },
      select: { code: true, name: true, parent: { select: { code: true } } },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    });
    const taxonomy = taxonomyRows.map((row) => {
      const rawName = row.name;
      const nameValue =
        typeof rawName === "string"
          ? rawName
          : rawName && typeof rawName === "object" && "fr" in rawName && typeof (rawName as { fr?: unknown }).fr === "string"
            ? String((rawName as { fr: string }).fr)
            : row.code;
      return { code: row.code, name: nameValue, parentCode: row.parent?.code ?? null };
    });

    try {
      analysis = await analyzeCvDocument({
        fileName: file.name,
        mimeType,
        buffer,
        taxonomy,
      });
    } catch (error) {
      console.error("[uploadCandidateDocument] CV analysis failed", error);
    }

    if (analysis) {
      const currentSkills = Array.isArray(profile.skills)
        ? profile.skills.filter((value): value is string => typeof value === "string")
        : [];
      const mergedSkills = [...new Set([...currentSkills, ...analysis.skills])];

      const primaryCategory = analysis.primaryCategoryCode
        ? taxonomyRows.find((row) => row.code === analysis!.primaryCategoryCode && !row.parent)
        : null;
      const resolvedSubCategoryCodes = analysis.subCategoryCodes.length
        ? taxonomyRows
            .filter((row) => analysis!.subCategoryCodes.includes(row.code) && row.parent?.code === analysis!.primaryCategoryCode)
            .map((row) => row.code)
        : [];

      const primaryCategoryId = primaryCategory
        ? (await prisma.jobCategory.findUnique({ where: { code: primaryCategory.code }, select: { id: true } }))?.id ?? null
        : profile.primaryCategoryId;

      const validSubIds = resolvedSubCategoryCodes.length
        ? (await prisma.jobCategory.findMany({
            where: { code: { in: resolvedSubCategoryCodes }, isActive: true },
            select: { id: true },
          })).map((row) => row.id)
        : Array.isArray(profile.subCategoryIds)
          ? profile.subCategoryIds.filter((value): value is string => typeof value === "string")
          : [];

      await prisma.candidateProfile.update({
        where: { id: profile.id },
        data: {
          skills: mergedSkills,
          headline: profile.headline || analysis.headline,
          bio: profile.bio || analysis.summary,
          experienceYears: profile.experienceYears ?? analysis.experienceYears,
          primaryCategoryId,
          subCategoryIds: validSubIds,
        },
      });

      const primaryCode = analysis.primaryCategoryCode || "A_CLASSER";
      const subCode = analysis.subCategoryCodes[0] || "GENERAL";
      folderPath = `CANDIDATS/${primaryCode}/${subCode}/CV/${new Date().getFullYear()}`;
      analyzedAt = new Date();
      isPrimaryCv = true;
    }
  }

  if (isCv) {
    await prisma.candidateDocument.updateMany({
      where: { candidateId: profile.id, docType: "CV", isPrimaryCv: true },
      data: { isPrimaryCv: false },
    });
  }

  await prisma.candidateDocument.create({
    data: {
      candidateId: profile.id,
      name: name.slice(0, 180),
      fileData: buffer,
      type: mimeType,
      docType,
      folderPath,
      analysis: analysis ? JSON.parse(JSON.stringify(analysis)) : undefined,
      analyzedAt,
      isPrimaryCv,
    },
  });

  try { revalidatePath("/espace/candidat"); } catch { /* test context */ }
}

export async function applyToJob(jobId: string, notes?: string) {
  let session = getActiveSessionContext();
  if (!session) {
    try { session = await auth(); } catch { /* test context */ }
  }
  const userId = session?.user?.id;
  if (!userId || session?.user?.role !== "CANDIDAT") {
    throw new Error("Vous devez être connecté en tant que candidat pour postuler.");
  }

  const application = await applyCandidateToJob(userId, jobId, notes);
  try {
    revalidatePath("/espace/candidat");
    revalidatePath(`/offres/${jobId}`);
  } catch {
    // revalidatePath only works inside Next.js request lifecycle
  }
  return application;
}
