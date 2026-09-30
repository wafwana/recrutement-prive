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

export async function qualifyAndMatchExternalOffer(externalJobId: string): Promise<QualificationResult> {
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

  const fallbackCategory = offer.categoryCode && validCodes.has(offer.categoryCode) ? offer.categoryCode : null;
  const fallbackSubCategory = offer.subCategoryCode && validCodes.has(offer.subCategoryCode) ? offer.subCategoryCode : null;

  // A missing/invalid AI result is not evidence that an offer is admissible.
  // Deterministic qualification is allowed only when the offer already carries a
  // valid taxonomy category; never assign an arbitrary first category.
  const inPlatformScope = analysis
    ? analysis.inPlatformScope === false
      ? false
      : Boolean(
          analysis.inPlatformScope &&
          ((analysis.categoryCode && validCodes.has(analysis.categoryCode)) || fallbackCategory)
        )
    : Boolean(fallbackCategory);

  const categoryCode =
    analysis?.categoryCode && validCodes.has(analysis.categoryCode)
      ? analysis.categoryCode
      : fallbackCategory;

  const subCategoryCode =
    analysis?.subCategoryCode && validCodes.has(analysis.subCategoryCode)
      ? analysis.subCategoryCode
      : fallbackSubCategory;

  const existingRawData =
    offer.rawData && typeof offer.rawData === "object" && !Array.isArray(offer.rawData)
      ? (offer.rawData as Record<string, unknown>)
      : {};

  if (!inPlatformScope && !analysis && !fallbackCategory) {
    return {
      success: false,
      externalJobId: offer.id,
      title: offer.title,
      qualified: false,
      status: offer.status,
      reason: "Qualification en attente : aucune analyse IA valide ni catégorie existante vérifiable.",
      matchesCount: 0,
      error: "Qualification non concluante; l'offre reste en attente de traitement.",
    };
  }

  if (!inPlatformScope) {
    const scopeReason = analysis?.scopeReason || "Offre hors périmètre ou non exploitable par la plateforme.";
    await prisma.externalJobOpportunity.update({
      where: { id: offer.id },
      data: {
        status: "REJECTED",
        rawData: {
          ...existingRawData,
          qualification: {
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
      status: "REJECTED",
      reason: scopeReason,
      matchesCount: 0,
    };
  }

  const qualifiedTitle = analysis?.title?.trim() || offer.title;
  const qualifiedSkills = analysis?.skills?.length ? analysis.skills : (Array.isArray(offer.skills) ? offer.skills.filter((s): s is string => typeof s === "string") : []);
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
          qualifiedAt: new Date().toISOString(),
          inPlatformScope: true,
          scopeReason: analysis?.scopeReason || "Offre qualifiée avec succès.",
          aiUsed: Boolean(analysis),
          confidence: analysis?.confidence ?? 0.8,
        },
      },
    },
  });

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
  results: QualificationResult[];
}> {
  const limit = options?.limit ?? 50;
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
        error: err instanceof Error ? err.message : "Erreur inconnue pendant la qualification/matching.",
      });
    }
  }

  return {
    totalProcessed: pendingOffers.length,
    qualified,
    rejected,
    matched,
    errors,
    results,
  };
}
