import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(_request: Request, { params }: RouteParams) {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : null;
  const role = typeof session?.user?.role === "string" ? session.user.role : null;
  if (!userId || role !== "OWNER") {
    return NextResponse.json({ error: "Seul l’OWNER peut intégrer une offre externe au vivier interne." }, { status: 403 });
  }

  const { id } = await params;
  const offer = await prisma.externalJobOpportunity.findUnique({ where: { id } });
  if (!offer) return NextResponse.json({ error: "Offre externe introuvable." }, { status: 404 });

  const rawData = asRecord(offer.rawData);
  const integration = asRecord(rawData.integration);
  const previousJobId = typeof integration.jobId === "string" ? integration.jobId : null;
  if (previousJobId) {
    const existingJob = await prisma.job.findUnique({ where: { id: previousJobId }, select: { id: true, status: true, title: true } });
    if (existingJob) return NextResponse.json({ ok: true, alreadyIntegrated: true, job: existingJob });
    return NextResponse.json({ error: "Une référence d’intégration existe, mais l’offre interne est introuvable. Vérification Owner requise." }, { status: 409 });
  }

  if (!["QUALIFIED", "MATCHING"].includes(offer.status)) {
    return NextResponse.json({ error: "Seules les offres qualifiées et matchées peuvent être intégrées." }, { status: 409 });
  }
  const qualification = asRecord(rawData.qualification);
  if (qualification.inPlatformScope !== true || !offer.categoryCode) {
    return NextResponse.json({ error: "La qualification métier doit être confirmée avant intégration." }, { status: 422 });
  }
  const companyName = offer.companyName?.trim();
  if (!companyName) return NextResponse.json({ error: "Le nom de l’entreprise source est absent. Complète et vérifie la provenance avant intégration." }, { status: 422 });

  const category = await prisma.jobCategory.findUnique({ where: { code: offer.categoryCode }, select: { id: true, parentId: true } });
  if (!category) return NextResponse.json({ error: "La catégorie métier de l’offre n’existe plus dans la taxonomie." }, { status: 422 });
  const subCategory = offer.subCategoryCode
    ? await prisma.jobCategory.findUnique({ where: { code: offer.subCategoryCode }, select: { id: true, parentId: true } })
    : null;
  if (offer.subCategoryCode && (!subCategory || subCategory.parentId !== category.id)) {
    return NextResponse.json({ error: "La sous-catégorie ne correspond pas à la catégorie principale." }, { status: 422 });
  }

  const staleLockBefore = new Date(Date.now() - 5 * 60 * 1000);
  const lock = await prisma.externalJobOpportunity.updateMany({
    where: {
      id,
      OR: [
        { status: { in: ["QUALIFIED", "MATCHING"] } },
        { status: "INTEGRATING", updatedAt: { lt: staleLockBefore } },
      ],
    },
    data: { status: "INTEGRATING" },
  });
  if (lock.count !== 1) return NextResponse.json({ error: "Cette offre est déjà en cours d’intégration. Réessaie après vérification." }, { status: 409 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.externalJobOpportunity.findUnique({ where: { id } });
      if (!current || current.status !== "INTEGRATING") throw new Error("INTEGRATION_LOCK_LOST");
      const currentRaw = asRecord(current.rawData);
      const currentIntegration = asRecord(currentRaw.integration);
      if (typeof currentIntegration.jobId === "string") throw new Error("ALREADY_INTEGRATED");

      const existingCompany = await tx.company.findFirst({
        where: { name: companyName, country: offer.country || null, sourceType: "EXTERNAL_OFFER", status: "SUSPENDED" },
        select: { id: true },
      });
      const company = existingCompany || await tx.company.create({
        data: {
          name: companyName,
          country: offer.country || null,
          sourceType: "EXTERNAL_OFFER",
          sourceUrl: offer.sourceUrl?.startsWith("https://") ? offer.sourceUrl : null,
          sourceCollectedAt: offer.sourceCollectedAt || offer.createdAt,
          status: "SUSPENDED",
          description: "Entreprise issue d’une offre externe. Fiche interne en attente de vérification Owner ; aucune exposition publique ni prise de contact automatique.",
        },
        select: { id: true },
      });
      const skills = Array.isArray(offer.skills) ? offer.skills.filter((value): value is string => typeof value === "string") : [];
      const job = await tx.job.create({
        data: {
          companyId: company.id,
          title: offer.title,
          location: [offer.city, offer.country].filter(Boolean).join(", ") || null,
          description: offer.description,
          requiredSkills: skills,
          requiredExperienceYears: offer.experienceYears,
          status: "DRAFT",
          jobCategoryId: category.parentId ? category.parentId : category.id,
          subCategoryId: category.parentId ? category.id : subCategory?.id || null,
          translations: offer.translations ?? undefined,
        },
        select: { id: true, title: true, status: true },
      });
      const integratedAt = new Date().toISOString();
      await tx.externalJobOpportunity.update({
        where: { id },
        data: {
          status: "INTEGRATED_DRAFT",
          rawData: {
            ...currentRaw,
            integration: {
              sourceOfferId: id,
              companyId: company.id,
              jobId: job.id,
              integratedAt,
              integratedByUserId: userId,
              companyVerificationStatus: "PENDING_OWNER_REVIEW",
              jobPublicationStatus: "DRAFT",
              humanValidationRequired: true,
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          actorRole: "OWNER",
          action: "EXTERNAL_OFFER_INTEGRATED_AS_DRAFT",
          targetType: "JOB",
          targetId: job.id,
          details: { externalOfferId: id, companyId: company.id, source: offer.source, status: "DRAFT", companyStatus: "SUSPENDED", publicExposure: false },
        },
      });
      return { job, companyId: company.id, integratedAt };
    });
    return NextResponse.json({ ok: true, alreadyIntegrated: false, ...result, message: "Brouillon interne créé. L’entreprise reste suspendue et l’offre n’est pas publiée." });
  } catch (error) {
    await prisma.externalJobOpportunity.updateMany({
      where: { id, status: "INTEGRATING" },
      data: { status: offer.status },
    }).catch(() => null);
    if (error instanceof Error && error.message === "ALREADY_INTEGRATED") {
      const refreshed = await prisma.externalJobOpportunity.findUnique({ where: { id } });
      const linkedId = asRecord(asRecord(refreshed?.rawData).integration).jobId;
      if (typeof linkedId === "string") {
        const existingJob = await prisma.job.findUnique({ where: { id: linkedId }, select: { id: true, title: true, status: true } });
        if (existingJob) return NextResponse.json({ ok: true, alreadyIntegrated: true, job: existingJob });
      }
    }
    console.error("[external-offer-integration] Failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "L’intégration a échoué. Aucun brouillon n’a été confirmé ; l’offre peut être réexaminée." }, { status: 500 });
  }
}