import { prisma } from "@/lib/prisma";
import { analyzeExternalOffer } from "@/lib/sourcing/offer-analyzer";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";

export type QualificationResult = {
  success: boolean;
  externalJobId: string;
  title: string;
  qualified: boolean;
  status: string;
  reason?: string;
  matchesCount: number;
  error?: string;
};

export async function qualifyAndMatchExternalOffer(
  externalJobId: string,
  options?: { force?: boolean }
): Promise<QualificationResult> {
  const offer = await prisma.externalJobOpportunity.findUnique({
    where: { id: externalJobId },
  });

  if (!offer) {
    return {
      success: false,
      externalJobId,
      title: "Inconnue",
      qualified: false,
      status: "NOT_FOUND",
      reason: "Offre introuvable dans la base de données.",
      matchesCount: 0,
      error: "Offre introuvable.",
    };
  }

  // Idempotency check: if offer is already processed and force is not true, skip
  if (
    !options?.force &&
    ["QUALIFIED", "MATCHING", "CONTACTED", "FILLED", "ARCHIVED", "REJECTED"].includes(offer.status)
  ) {
    const existingRaw = offer.rawData && typeof offer.rawData === "object" && !Array.isArray(offer.rawData)
      ? (offer.rawData as Record<string, unknown>)
      : {};
    const existingMatching = existingRaw?.matching && typeof existingRaw.matching === "object"
      ? (existingRaw.matching as Record<string, unknown>)
      : null;
    const matchCount = typeof existingMatching?.matchCount === "number" ? existingMatching.matchCount : 0;

    return {
      success: true,
      externalJobId: offer.id,
      title: offer.title,
      qualified: offer.status === "QUALIFIED" || offer.status === "MATCHING",
      status: offer.status,
      reason: "Offre déjà traitée.",
      matchesCount: matchCount,
    };
  }

  // Atomic lock acquisition & stale lock recovery (5 minutes timeout)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const acquiredLock = await prisma.externalJobOpportunity.updateMany({
    where: {
      id: externalJobId,
      OR: [
        { status: { in: ["DETECTED", "A_QUALIFIER"] } },
        { status: "QUALIFYING", updatedAt: { lt: fiveMinutesAgo } },
      ],
    },
    data: { status: "QUALIFYING" },
  });

  if (acquiredLock.count === 0 && !options?.force) {
    return {
      success: false,
      externalJobId,
      title: offer.title,
      qualified: false,
      status: offer.status,
      reason: "Verrou non acquis : offre en cours de traitement par un autre processus.",
      matchesCount: 0,
    };
  }

  const taxonomy = await prisma.jobCategory.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, parentId: true },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
  });

  const taxonomyItems = taxonomy.map((row) => ({
    code: row.code,
    name:
      typeof row.name === "object" && row.name !== null && "fr" in row.name
        ? String((row.name as Record<string, unknown>).fr || row.code)
        : row.code,
    parentCode: taxonomy.find((parent) => parent.id === row.parentId)?.code || null,
  }));

  const validCodes = new Set(taxonomy.map((t) => t.code));

  let analysis = null;
  try {
    analysis = await analyzeExternalOffer({
      title: offer.title,
      description: offer.description,
      companyName: offer.companyName,
      country: offer.country,
      city: offer.city,
      sourceUrl: offer.sourceUrl,
      taxonomy: taxonomyItems,
    });
  } catch (err) {
    console.warn("[offer-pipeline] AI qualification unavailable/error:", err instanceof Error ? err.message : err);
  }

  // Determine Category safely - NEVER arbitrarily default to taxonomy[0]
  let categoryCode: string | null = null;
  if (analysis?.categoryCode && validCodes.has(analysis.categoryCode)) {
    categoryCode = analysis.categoryCode;
  } else if (offer.categoryCode && validCodes.has(offer.categoryCode)) {
    categoryCode = offer.categoryCode;
  } else {
    // Attempt deterministic keyword lookup against taxonomy
    const titleLower = offer.title.toLowerCase();
    for (const item of taxonomy) {
      if (item.code && titleLower.includes(item.code.toLowerCase())) {
        categoryCode = item.code;
        break;
      }
    }
  }

  let subCategoryCode: string | null = null;
  if (analysis?.subCategoryCode && validCodes.has(analysis.subCategoryCode)) {
    subCategoryCode = analysis.subCategoryCode;
  } else if (offer.subCategoryCode && validCodes.has(offer.subCategoryCode)) {
    subCategoryCode = offer.subCategoryCode;
  }

  const inPlatformScope = analysis
    ? analysis.inPlatformScope && Boolean(categoryCode)
    : Boolean(categoryCode && offer.title && offer.title.trim().length >= 3 && !/spam|test|junk|fake/i.test(offer.title));

  const existingRawData =
    offer.rawData && typeof offer.rawData === "object" && !Array.isArray(offer.rawData)
      ? (offer.rawData as Record<string, unknown>)
      : {};

  const existingQual =
    existingRawData.qualification && typeof existingRawData.qualification === "object"
      ? (existingRawData.qualification as Record<string, unknown>)
      : {};

  const attemptCount = (typeof existingQual.attemptCount === "number" ? existingQual.attemptCount : 0) + 1;

  if (!inPlatformScope || !categoryCode) {
    const scopeReason =
      analysis?.scopeReason ||
      (!categoryCode ? "Catégorie professionnelle indéterminée, qualification requise." : "Offre hors périmètre.");

    const newStatus = !categoryCode ? "A_QUALIFIER" : "REJECTED";

    await prisma.externalJobOpportunity.update({
      where: { id: offer.id },
      data: {
        status: newStatus,
        rawData: {
          ...existingRawData,
          qualification: {
            ...existingQual,
            attemptCount,
            lastAttemptedAt: new Date().toISOString(),
            qualifiedAt: new Date().toISOString(),
            inPlatformScope: false,
            scopeReason,
            aiUsed: Boolean(analysis),
          },
        },
      },
    });

    return {
      success: true,
      externalJobId: offer.id,
      title: offer.title,
      qualified: false,
      status: newStatus,
      reason: scopeReason,
      matchesCount: 0,
    };
  }

  const qualifiedTitle = analysis?.title?.trim() || offer.title;
  const qualifiedSkills = analysis?.skills?.length
    ? analysis.skills
    : Array.isArray(offer.skills)
    ? offer.skills.filter((s): s is string => typeof s === "string")
    : [];
  const qualifiedExperience = analysis?.experienceYears ?? offer.experienceYears ?? null;
  const qualifiedLanguage = analysis?.language || offer.language || null;
  const qualifiedDescription = analysis?.summary || offer.description || null;

  await prisma.externalJobOpportunity.update({
    where: { id: offer.id },
    data: {
      title: qualifiedTitle,
      categoryCode,
      subCategoryCode,
      skills: qualifiedSkills,
      experienceYears: qualifiedExperience,
      language: qualifiedLanguage,
      status: "QUALIFIED",
      rawData: {
        ...existingRawData,
        qualification: {
          ...existingQual,
          attemptCount,
          lastAttemptedAt: new Date().toISOString(),
          qualifiedAt: new Date().toISOString(),
          inPlatformScope: true,
          scopeReason: analysis?.scopeReason || "Offre qualifiée avec succès.",
          aiUsed: Boolean(analysis),
          confidence: analysis?.confidence ?? 0.8,
        },
      },
    },
  });

  // Candidate Matching Execution
  const candidates = await prisma.candidateProfile.findMany({
    where: { status: "ACTIVE" },
    include: {
      primaryCategory: { select: { code: true } },
    },
    take: 1000,
  });

  const categoryRows = await prisma.jobCategory.findMany({ select: { id: true, code: true } });
  const categoryCodesMap = new Map(categoryRows.map((row) => [row.id, row.code]));

  const matches = candidates
    .map((candidate) => {
      const candidateSubCategoryCodes = Array.isArray(candidate.subCategoryIds)
        ? candidate.subCategoryIds
            .filter((value): value is string => typeof value === "string")
            .map((value) => categoryCodesMap.get(value) || value)
        : [];

      const result = matchCandidateToJob(
        {
          skills: candidate.skills,
          experienceYears: candidate.experienceYears,
          headline: candidate.headline,
          bio: candidate.bio,
          location: candidate.location,
          country: candidate.country,
          primaryCategoryCode: candidate.primaryCategory?.code,
          subCategoryCodes: candidateSubCategoryCodes,
        },
        {
          requiredSkills: qualifiedSkills,
          requiredExperienceYears: qualifiedExperience,
          title: qualifiedTitle,
          description: qualifiedDescription,
          location: [offer.city, offer.country].filter(Boolean).join(", ") || null,
          categoryCode,
          subCategoryCode,
        }
      );

      return {
        candidateId: candidate.id,
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        categoryMatchLevel: result.categoryMatchLevel,
        reasons: result.reasons,
      };
    })
    .filter((match) => match.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  await prisma.externalJobOpportunity.update({
    where: { id: offer.id },
    data: {
      status: "MATCHING",
      rawData: {
        ...existingRawData,
        qualification: {
          ...existingQual,
          attemptCount,
          lastAttemptedAt: new Date().toISOString(),
          qualifiedAt: new Date().toISOString(),
          inPlatformScope: true,
          scopeReason: analysis?.scopeReason || "Offre qualifiée avec succès.",
          aiUsed: Boolean(analysis),
          confidence: analysis?.confidence ?? 0.8,
        },
        matching: {
          matchedAt: new Date().toISOString(),
          totalCandidatesEvaluated: candidates.length,
          matchCount: matches.length,
          topMatches: matches,
        },
      },
    },
  });

  return {
    success: true,
    externalJobId: offer.id,
    title: qualifiedTitle,
    qualified: true,
    status: "MATCHING",
    matchesCount: matches.length,
  };
}

export async function processOfferBatch(options?: {
  limit?: number;
  statusFilter?: string[];
}): Promise<{
  totalProcessed: number;
  qualified: number;
  rejected: number;
  matched: number;
  errors: number;
  remainingPendingCount: number;
  progressMade: boolean;
  hasMore: boolean;
  results: QualificationResult[];
}> {
  // Safe default batch limit of 20 to ensure sub-10 second execution on Vercel HTTP handlers
  const limit = Math.min(20, Math.max(1, options?.limit ?? 20));
  const statusFilter = options?.statusFilter ?? ["DETECTED", "A_QUALIFIER"];

  const pendingOffers = await prisma.externalJobOpportunity.findMany({
    where: {
      status: { in: statusFilter },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: { id: true },
  });

  let qualified = 0;
  let rejected = 0;
  let matched = 0;
  let errors = 0;
  const results: QualificationResult[] = [];

  for (const pending of pendingOffers) {
    try {
      const res = await qualifyAndMatchExternalOffer(pending.id);
      results.push(res);
      if (res.qualified) {
        qualified++;
        if (res.matchesCount > 0) matched++;
      } else if (res.status === "REJECTED") {
        rejected++;
      }
    } catch (err) {
      errors++;
      results.push({
        success: false,
        externalJobId: pending.id,
        title: "Erreur",
        qualified: false,
        status: "ERROR",
        matchesCount: 0,
        error: err instanceof Error ? err.message : "Erreur pendant la qualification/matching.",
      });
      // Revert status from QUALIFYING to A_QUALIFIER on unhandled error so it can be retried
      await prisma.externalJobOpportunity.updateMany({
        where: { id: pending.id, status: "QUALIFYING" },
        data: { status: "A_QUALIFIER" },
      }).catch(() => null);
    }
  }

  const remainingPendingCount = await prisma.externalJobOpportunity.count({
    where: { status: { in: statusFilter } },
  });

  // Progress is made if at least one offer transitioned out of pending status (QUALIFIED or REJECTED)
  const progressMade = qualified > 0 || rejected > 0;
  const hasMore = remainingPendingCount > 0 && progressMade;

  return {
    totalProcessed: pendingOffers.length,
    qualified,
    rejected,
    matched,
    errors,
    remainingPendingCount,
    progressMade,
    hasMore,
    results,
  };
}
