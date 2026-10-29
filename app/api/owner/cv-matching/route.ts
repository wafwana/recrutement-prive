import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { matchCandidateToJob, CriterionDetail } from "@/lib/matching/candidate-job";
import { z } from "zod";

const proposeAnonymizedSchema = z.object({
  action: z.literal("propose_anonymized"),
  candidateId: z.string().trim().min(1).max(128),
  jobId: z.string().trim().min(1).max(128),
});

const proposeFullSchema = z.object({
  action: z.literal("propose_full"),
  candidateId: z.string().trim().min(1).max(128),
  jobId: z.string().trim().min(1).max(128),
});

const connectMatchmakingSchema = z.object({
  action: z.literal("connect_matchmaking"),
  candidateId: z.string().trim().min(1).max(128),
  jobId: z.string().trim().min(1).max(128),
});

const presentationSchema = z.object({
  action: z.literal("present"),
  candidateId: z.string().trim().min(1).max(128),
  jobId: z.string().trim().min(1).max(128),
});

const recalculateSchema = z.object({
  action: z.literal("recalculate"),
  candidateId: z.string().trim().min(1).max(128).optional(),
  jobId: z.string().trim().min(1).max(128).optional(),
});

const matchingPostSchema = z.discriminatedUnion("action", [
  proposeAnonymizedSchema,
  proposeFullSchema,
  connectMatchmakingSchema,
  presentationSchema,
  recalculateSchema,
]);

function candidateAlias(id: string) {
  return "Profil #" + id.slice(-6).toUpperCase();
}

function companyAlias(id: string) {
  return "Entreprise #" + id.slice(-6).toUpperCase();
}

function stringIds(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

async function requireMatchingAccess() {
  let active = getActiveSessionContext();
  if (!active) {
    try {
      active = await auth();
    } catch {
      // Fallback when executed outside Next.js request store context (e.g. test environment)
    }
  }
  const userId = typeof active?.user?.id === "string" ? active.user.id : undefined;
  const role = typeof active?.user?.role === "string" ? active.user.role : undefined;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role ?? "")) return null;
  if (!role || !(await hasPermission(userId, role, "CV_MATCHING"))) return null;
  return { userId, role };
}

export async function GET(request: Request) {
  const access = await requireMatchingAccess();
  if (!access) return NextResponse.json({ error: "Permission de matching non accordée par l'Owner." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get("candidateId")?.trim();
  const jobId = searchParams.get("jobId")?.trim();
  const mode = searchParams.get("mode")?.trim();

  if (mode === "overview") {
    const canPresent = access.role === "OWNER" || (
      access.role === "ADMIN" &&
      await hasPermission(access.userId, access.role, "PRESENTATIONS_MANAGE")
    );
    const [candidates, jobs] = await Promise.all([
      prisma.candidateProfile.findMany({
        where: { status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        take: 150,
        select: {
          id: true,
          userId: true,
          headline: true,
          bio: true,
          skills: true,
          experienceYears: true,
          location: true,
          country: true,
          subCategoryIds: true,
          primaryCategory: { select: { code: true } },
        },
      }),
      prisma.job.findMany({
        where: { status: "OPEN" },
        orderBy: { updatedAt: "desc" },
        take: 150,
        select: {
          id: true,
          title: true,
          location: true,
          companyId: true,
          company: { select: { country: true } },
          description: true,
          requiredSkills: true,
          requiredExperienceYears: true,
          jobCategory: { select: { code: true } },
          subCategory: { select: { code: true } },
        },
      }),
    ]);

    if (!candidates.length || !jobs.length) {
      return NextResponse.json({
        canPresent,
        candidateCount: candidates.length,
        jobCount: jobs.length,
        totalMatches: 0,
        truncated: false,
        suggestions: [],
        candidateSuggestions: [],
        offerSuggestions: [],
      });
    }

    const allSubCategoryIds = [...new Set(candidates.flatMap((candidate) => stringIds(candidate.subCategoryIds)))];
    const subCategoryRows = allSubCategoryIds.length
      ? await prisma.jobCategory.findMany({
          where: { id: { in: allSubCategoryIds } },
          select: { id: true, code: true },
        })
      : [];
    const subCategoryCodeById = new Map(subCategoryRows.map((row) => [row.id, row.code]));
    const [applications] = await Promise.all([
      prisma.application.findMany({
        where: {
          candidateId: { in: candidates.map((candidate) => candidate.id) },
          jobId: { in: jobs.map((job) => job.id) },
        },
        select: {
          candidateId: true,
          jobId: true,
          status: true,
          presentations: { select: { id: true, state: true } },
        },
      }),
    ]);
    const applicationsByPair = new Map(
      applications.map((application) => [application.candidateId + "::" + application.jobId, application])
    );

    const ranked: Array<{
      candidateId: string;
      candidateAlias: string;
      candidateHeadline: string | null;
      candidateLocation: string | null;
      candidateCountry: string | null;
      experienceYears: number | null;
      jobId: string;
      jobTitle: string;
      companyAlias: string;
      jobLocation: string | null;
      score: number;
      matchedSkills: string[];
      missingSkills: string[];
      reasons: string[];
      categoryMatchLevel: string;
      countryFit: string;
      criteriaDetails: CriterionDetail[];
      evidenceProofs: string[];
      strengths: string[];
      risksAndReserves: string[];
      calculatedAt: string;
      applicationStatus: string | null;
      presentationExists: boolean;
      presentationState: string | null;
    }> = [];

    for (const candidate of candidates) {
      const candidateSubCategories = stringIds(candidate.subCategoryIds)
        .map((id) => subCategoryCodeById.get(id))
        .filter((code): code is string => Boolean(code));
      for (const job of jobs) {
        const result = matchCandidateToJob(
          {
            skills: candidate.skills,
            experienceYears: candidate.experienceYears,
            headline: candidate.headline,
            bio: candidate.bio,
            location: candidate.location,
            country: candidate.country,
            primaryCategoryCode: candidate.primaryCategory?.code,
            subCategoryCodes: candidateSubCategories,
          },
          {
            requiredSkills: job.requiredSkills,
            requiredExperienceYears: job.requiredExperienceYears,
            title: job.title,
            description: job.description,
            location: job.location,
            country: job.company?.country,
            categoryCode: job.jobCategory?.code,
            subCategoryCode: job.subCategory?.code,
          }
        );
        if (result.score < 25) continue;
        const application = applicationsByPair.get(candidate.id + "::" + job.id);
        const presentation = application?.presentations[0];
        ranked.push({
          candidateId: candidate.id,
          candidateAlias: candidateAlias(candidate.id),
          candidateHeadline: candidate.headline,
          candidateLocation: candidate.location,
          candidateCountry: candidate.country,
          experienceYears: candidate.experienceYears,
          jobId: job.id,
          jobTitle: job.title,
          companyAlias: companyAlias(job.companyId),
          jobLocation: job.location,
          score: result.score,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
          reasons: result.reasons,
          categoryMatchLevel: result.categoryMatchLevel,
          countryFit: result.countryFit,
          criteriaDetails: result.criteriaDetails,
          evidenceProofs: result.evidenceProofs,
          strengths: result.strengths,
          risksAndReserves: result.risksAndReserves,
          calculatedAt: result.calculatedAt,
          applicationStatus: application?.status ?? null,
          presentationExists: Boolean(presentation),
          presentationState: presentation?.state ?? null,
        });
      }
    }

    ranked.sort((a, b) => b.score - a.score);
    const candidateSuggestionCounts = new Map<string, number>();
    const offerSuggestionCounts = new Map<string, number>();
    const candidateSuggestions: typeof ranked = [];
    const offerSuggestions: typeof ranked = [];
    for (const item of ranked) {
      const candidateCount = candidateSuggestionCounts.get(item.candidateId) || 0;
      if (candidateCount < 3) {
        candidateSuggestions.push(item);
        candidateSuggestionCounts.set(item.candidateId, candidateCount + 1);
      }
      const offerCount = offerSuggestionCounts.get(item.jobId) || 0;
      if (offerCount < 3) {
        offerSuggestions.push(item);
        offerSuggestionCounts.set(item.jobId, offerCount + 1);
      }
    }
    return NextResponse.json({
      canPresent,
      candidateCount: candidates.length,
      jobCount: jobs.length,
      totalMatches: ranked.length,
      truncated: ranked.length > 100,
      suggestions: ranked.slice(0, 100),
      candidateSuggestions,
      offerSuggestions,
    });
  }

  if (mode === "jobs") {
    const jobs = await prisma.job.findMany({
      where: { status: "OPEN" },
      select: { id: true, title: true, location: true, companyId: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    return NextResponse.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        location: job.location,
        company: { name: companyAlias(job.companyId) },
      })),
    });
  }

  if (jobId) {
    const job = await prisma.job.findFirst({
      where: { id: jobId, status: "OPEN" },
      select: {
        id: true,
        title: true,
        location: true,
        company: { select: { country: true } },
        description: true,
        requiredSkills: true,
        requiredExperienceYears: true,
        jobCategory: { select: { code: true } },
        subCategory: { select: { code: true } },
      },
    });
    if (!job) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });

    const candidates = await prisma.candidateProfile.findMany({
      where: { status: "ACTIVE" },
      include: {
        primaryCategory: { select: { code: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    const candidateIds = candidates.flatMap((candidate) =>
      Array.isArray(candidate.subCategoryIds)
        ? candidate.subCategoryIds.filter((value): value is string => typeof value === "string")
        : []
    );
    const subCategoryRows = candidateIds.length
      ? await prisma.jobCategory.findMany({ where: { id: { in: candidateIds } }, select: { id: true, code: true } })
      : [];
    const subCategoryCodeById = new Map(subCategoryRows.map((row) => [row.id, row.code]));

    const matches = candidates
      .map((candidate) => {
        const subCategoryCodes = Array.isArray(candidate.subCategoryIds)
          ? candidate.subCategoryIds
              .filter((value): value is string => typeof value === "string")
              .map((id) => subCategoryCodeById.get(id))
              .filter((value): value is string => Boolean(value))
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
            subCategoryCodes,
          },
          {
            requiredSkills: job.requiredSkills,
            requiredExperienceYears: job.requiredExperienceYears,
            title: job.title,
            description: job.description,
            location: job.location,
            country: job.company?.country,
            categoryCode: job.jobCategory?.code,
            subCategoryCode: job.subCategory?.code,
          }
        );
        return {
          candidateId: candidate.id,
          candidateAlias: candidateAlias(candidate.id),
          headline: candidate.headline,
          location: candidate.location,
          country: candidate.country,
          experienceYears: candidate.experienceYears,
          score: result.score,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
          reasons: result.reasons,
          categoryMatchLevel: result.categoryMatchLevel,
          countryFit: result.countryFit,
          criteriaDetails: result.criteriaDetails,
          evidenceProofs: result.evidenceProofs,
          strengths: result.strengths,
          risksAndReserves: result.risksAndReserves,
          calculatedAt: result.calculatedAt,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);

    await prisma.auditLog.create({
      data: {
        actorUserId: access.userId,
        actorRole: access.role,
        action: "CV_JOB_REMATCH",
        targetType: "JOB",
        targetId: job.id,
        details: { candidatesAnalysed: candidates.length, matchesReturned: matches.length },
      },
    });

    return NextResponse.json({
      job: { id: job.id, title: job.title, location: job.location },
      matches,
    });
  }

  if (!candidateId) return NextResponse.json({ error: "candidateId requis." }, { status: 400 });

  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: candidateId },
    include: { primaryCategory: { select: { code: true } } },
  });
  if (!candidate) return NextResponse.json({ error: "Candidat introuvable." }, { status: 404 });

  const subCategoryCodes = Array.isArray(candidate.subCategoryIds)
    ? (await prisma.jobCategory.findMany({
        where: { id: { in: candidate.subCategoryIds.filter((v): v is string => typeof v === "string") } },
        select: { code: true },
      })).map((row) => row.code)
    : [];

  const jobs = await prisma.job.findMany({
    where: { status: "OPEN" },
    include: {
      jobCategory: { select: { code: true } },
      subCategory: { select: { code: true } },
      company: { select: { country: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const matches = jobs
    .map((job) => {
      const result = matchCandidateToJob(
        {
          skills: candidate.skills,
          experienceYears: candidate.experienceYears,
          headline: candidate.headline,
          bio: candidate.bio,
          location: candidate.location,
          country: candidate.country,
          primaryCategoryCode: candidate.primaryCategory?.code,
          subCategoryCodes,
        },
        {
          requiredSkills: job.requiredSkills,
          requiredExperienceYears: job.requiredExperienceYears,
          title: job.title,
          description: job.description,
          location: job.location,
          country: job.company?.country,
          categoryCode: job.jobCategory?.code,
          subCategoryCode: job.subCategory?.code,
        }
      );
      return {
        jobId: job.id,
        title: job.title,
        companyAlias: companyAlias(job.companyId),
        location: job.location,
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        reasons: result.reasons,
        categoryMatchLevel: result.categoryMatchLevel,
        countryFit: result.countryFit,
        criteriaDetails: result.criteriaDetails,
        evidenceProofs: result.evidenceProofs,
        strengths: result.strengths,
        risksAndReserves: result.risksAndReserves,
        calculatedAt: result.calculatedAt,
      };
    })
    .sort((a, b) => b.score - a.score);

  await prisma.auditLog.create({
    data: {
      actorUserId: access.userId,
      actorRole: access.role,
      action: "CV_CANDIDATE_REMATCH",
      targetType: "CANDIDATE",
      targetId: candidate.id,
      details: { openJobs: jobs.length, matchesReturned: matches.length },
    },
  });

  return NextResponse.json({
    candidate: {
      id: candidate.id,
      alias: candidateAlias(candidate.id),
      headline: candidate.headline,
      skills: candidate.skills,
      experienceYears: candidate.experienceYears,
      primaryCategoryCode: candidate.primaryCategory?.code ?? null,
      subCategoryCodes,
    },
    matches,
  });
}

export async function POST(request: Request) {
  const access = await requireMatchingAccess();
  if (!access) {
    return NextResponse.json({ error: "Permission de matching non accordée." }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }
  const parsed = matchingPostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Action, candidat ou offre invalide." }, { status: 400 });
  }

  if (parsed.data.action === "propose_anonymized") {
    const { candidateId, jobId } = parsed.data;
    const [candidate, job] = await Promise.all([
      prisma.candidateProfile.findFirst({
        where: { id: candidateId },
        select: {
          id: true,
          userId: true,
          status: true,
          headline: true,
          bio: true,
          skills: true,
          experienceYears: true,
          location: true,
          country: true,
          subCategoryIds: true,
          primaryCategory: { select: { code: true } },
          user: { select: { status: true } },
        },
      }),
      prisma.job.findFirst({
        where: { id: jobId, status: "OPEN" },
        select: {
          id: true,
          title: true,
          companyId: true,
          location: true,
          company: { select: { country: true } },
          description: true,
          requiredSkills: true,
          requiredExperienceYears: true,
          jobCategory: { select: { code: true } },
          subCategory: { select: { code: true } },
        },
      }),
    ]);

    if (!candidate || !job) {
      return NextResponse.json({ error: "Le candidat ou l’offre n’est plus disponible pour une proposition anonymisée." }, { status: 404 });
    }

    if (candidate.status !== "ACTIVE" || candidate.user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Consentement non confirmé : le candidat est inactif ou exclu." }, { status: 403 });
    }

    const subCategoryIds = Array.isArray(candidate.subCategoryIds)
      ? candidate.subCategoryIds.filter((v): v is string => typeof v === "string")
      : [];

    const candidateSubCategories = await prisma.jobCategory.findMany({
      where: { id: { in: subCategoryIds } },
      select: { code: true },
    }).then((rows) => rows.map((r) => r.code));

    const match = matchCandidateToJob(
      {
        skills: candidate.skills,
        experienceYears: candidate.experienceYears,
        headline: candidate.headline,
        bio: candidate.bio,
        location: candidate.location,
        country: candidate.country,
        primaryCategoryCode: candidate.primaryCategory?.code,
        subCategoryCodes: candidateSubCategories,
      },
      {
        requiredSkills: job.requiredSkills,
        requiredExperienceYears: job.requiredExperienceYears,
        title: job.title,
        description: job.description,
        location: job.location,
        country: job.company?.country,
        categoryCode: job.jobCategory?.code,
        subCategoryCode: job.subCategory?.code,
      }
    );

    const { applicationId } = await prisma.$transaction(async (tx) => {
      const existingApp = await tx.application.findFirst({
        where: { candidateId: candidate.id, jobId: job.id },
        select: { id: true, status: true },
      });

      let appId = existingApp?.id;
      if (!appId) {
        const app = await tx.application.create({
          data: {
            candidateId: candidate.id,
            userId: candidate.userId,
            jobId: job.id,
            status: "REVIEWING",
            notes: "Préparation de proposition anonymisée.",
          },
          select: { id: true },
        });
        appId = app.id;
      }

      const existingHistory = await tx.recruitmentHistory.findFirst({
        where: { applicationId: appId, action: "PROPOSE_ANONYMIZED" },
      });

      if (!existingHistory) {
        await tx.recruitmentHistory.create({
          data: {
            applicationId: appId,
            jobId: job.id,
            actorUserId: access.userId,
            action: "PROPOSE_ANONYMIZED",
            fromStatus: existingApp?.status || null,
            toStatus: existingApp?.status || "REVIEWING",
            details: {
              candidateAlias: candidateAlias(candidate.id),
              companyAlias: companyAlias(job.companyId),
              score: match.score,
              anonymized: true,
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: access.userId,
          actorRole: access.role,
          action: "PROPOSAL_ANONYMIZED_PREPARED",
          targetType: "PROPOSAL",
          targetId: `${candidate.id}::${job.id}`,
          details: {
            candidateAlias: candidateAlias(candidate.id),
            companyAlias: companyAlias(job.companyId),
            score: match.score,
            anonymized: true,
            applicationId: appId,
          },
        },
      });

      return { applicationId: appId };
    });

    return NextResponse.json({
      success: true,
      action: "propose_anonymized",
      proposal: {
        candidateAlias: candidateAlias(candidate.id),
        companyAlias: companyAlias(job.companyId),
        headline: candidate.headline,
        experienceYears: candidate.experienceYears,
        score: match.score,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        reasons: match.reasons,
      },
      message: "Dossier anonymisé préparé avec succès. Les identités et coordonnées restent strictement masquées.",
    });
  }

  if (parsed.data.action === "propose_full") {
    const canManagePresentations = access.role === "OWNER" || (
      access.role === "ADMIN" && await hasPermission(access.userId, access.role, "PRESENTATIONS_MANAGE")
    );
    if (!canManagePresentations) {
      return NextResponse.json({ error: "La préparation d'une proposition complète est réservée à l’OWNER ou à un ADMIN autorisé." }, { status: 403 });
    }

    const { candidateId, jobId } = parsed.data;
    const [candidate, job] = await Promise.all([
      prisma.candidateProfile.findFirst({
        where: { id: candidateId },
        include: {
          user: { select: { name: true, email: true, status: true } },
          documents: { where: { docType: "CV" }, select: { id: true, name: true, createdAt: true } },
          primaryCategory: { select: { code: true } },
        },
      }),
      prisma.job.findFirst({
        where: { id: jobId, status: "OPEN" },
        include: {
          company: { select: { id: true, name: true, country: true } },
          jobCategory: { select: { code: true } },
          subCategory: { select: { code: true } },
        },
      }),
    ]);

    if (!candidate || !job) {
      return NextResponse.json({ error: "Le candidat ou l’offre n’est plus disponible pour une proposition complète." }, { status: 404 });
    }

    if (candidate.status !== "ACTIVE" || candidate.user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Consentement non confirmé : le candidat est inactif ou exclu du partage de données." }, { status: 403 });
    }

    // Fail closed: generic preference booleans are not a verifiable, auditable
    // consent record linked to the candidate's explicit consent workflow.
    // Keep full proposals blocked until such a persisted proof exists.
    const hasExplicitPositiveConsent = false;

    if (!hasExplicitPositiveConsent) {
      return NextResponse.json({
        error: "Consentement non confirmé : le candidat n'a pas enregistré d'accord positif explicite pour la communication de ses données personnelles.",
      }, { status: 403 });
    }

    const subCategoryIds = Array.isArray(candidate.subCategoryIds)
      ? candidate.subCategoryIds.filter((v): v is string => typeof v === "string")
      : [];

    const candidateSubCategories = await prisma.jobCategory.findMany({
      where: { id: { in: subCategoryIds } },
      select: { code: true },
    }).then((rows) => rows.map((r) => r.code));

    const match = matchCandidateToJob(
      {
        skills: candidate.skills,
        experienceYears: candidate.experienceYears,
        headline: candidate.headline,
        bio: candidate.bio,
        location: candidate.location,
        country: candidate.country,
        primaryCategoryCode: candidate.primaryCategory?.code,
        subCategoryCodes: candidateSubCategories,
      },
      {
        requiredSkills: job.requiredSkills,
        requiredExperienceYears: job.requiredExperienceYears,
        title: job.title,
        description: job.description,
        location: job.location,
        country: job.company?.country,
        categoryCode: job.jobCategory?.code,
        subCategoryCode: job.subCategory?.code,
      }
    );

    await prisma.$transaction(async (tx) => {
      const existingApp = await tx.application.findFirst({
        where: { candidateId: candidate.id, jobId: job.id },
        select: { id: true, status: true },
      });

      let appId = existingApp?.id;
      if (!appId) {
        const app = await tx.application.create({
          data: {
            candidateId: candidate.id,
            userId: candidate.userId,
            jobId: job.id,
            status: "SHORTLISTED",
            notes: "Préparation de proposition complète transmise aux habilités.",
          },
          select: { id: true },
        });
        appId = app.id;
      }

      const existingHistory = await tx.recruitmentHistory.findFirst({
        where: { applicationId: appId, action: "PROPOSE_FULL" },
      });

      if (!existingHistory) {
        await tx.recruitmentHistory.create({
          data: {
            applicationId: appId,
            jobId: job.id,
            actorUserId: access.userId,
            action: "PROPOSE_FULL",
            fromStatus: existingApp?.status || null,
            toStatus: existingApp?.status || "SHORTLISTED",
            details: {
              candidateName: candidate.user.name,
              companyName: job.company.name,
              score: match.score,
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: access.userId,
          actorRole: access.role,
          action: "PROPOSAL_FULL_PREPARED",
          targetType: "PROPOSAL",
          targetId: `${candidate.id}::${job.id}`,
          details: {
            candidateId: candidate.id,
            candidateName: candidate.user.name,
            companyName: job.company.name,
            score: match.score,
            cvCount: candidate.documents.length,
            applicationId: appId,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      action: "propose_full",
      proposal: {
        candidateId: candidate.id,
        candidateAlias: candidateAlias(candidate.id),
        candidateName: candidate.user.name,
        companyName: job.company.name,
        jobTitle: job.title,
        score: match.score,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        cvDocuments: candidate.documents,
      },
      message: "Dossier complet préparé avec succès pour le traitement habilité.",
    });
  }

  if (parsed.data.action === "connect_matchmaking" || parsed.data.action === "present") {
    const canPresent = access.role === "OWNER" || (
      access.role === "ADMIN" &&
      await hasPermission(access.userId, access.role, "PRESENTATIONS_MANAGE")
    );
    if (!canPresent) {
      return NextResponse.json({ error: "La mise en relation est réservée à l’OWNER ou à un ADMIN explicitement habilité." }, { status: 403 });
    }

    const { candidateId, jobId } = parsed.data;

    const [candidate, job] = await Promise.all([
      prisma.candidateProfile.findFirst({
        where: { id: candidateId, status: "ACTIVE" },
        select: {
          id: true,
          userId: true,
          headline: true,
          bio: true,
          skills: true,
          experienceYears: true,
          location: true,
          country: true,
          subCategoryIds: true,
          primaryCategory: { select: { code: true } },
        },
      }),
      prisma.job.findFirst({
        where: { id: jobId, status: "OPEN" },
        select: {
          id: true,
          title: true,
          companyId: true,
          location: true,
          company: { select: { country: true } },
          description: true,
          requiredSkills: true,
          requiredExperienceYears: true,
          jobCategory: { select: { code: true } },
          subCategory: { select: { code: true } },
        },
      }),
    ]);
    if (!candidate || !job) {
      return NextResponse.json({ error: "Le candidat ou l’offre n’est plus disponible." }, { status: 404 });
    }

    const subCategoryIds = Array.isArray(candidate.subCategoryIds)
      ? candidate.subCategoryIds.filter((v): v is string => typeof v === "string")
      : [];

    const [candidateSubCategories, companyUser] = await Promise.all([
      prisma.jobCategory.findMany({
        where: { id: { in: subCategoryIds } },
        select: { code: true },
      }).then((rows) => rows.map((r) => r.code)),
      prisma.user.findFirst({
        where: {
          status: "ACTIVE",
          companyLinks: { some: { companyId: job.companyId } },
        },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      }),
    ]);

    if (!companyUser) {
      return NextResponse.json({
        error: "Aucun compte entreprise actif n’est relié à cette offre. Reliez d’abord un recruteur à l’entreprise avant de préparer une présentation sécurisée.",
      }, { status: 409 });
    }

    const match = matchCandidateToJob(
      {
        skills: candidate.skills,
        experienceYears: candidate.experienceYears,
        headline: candidate.headline,
        bio: candidate.bio,
        location: candidate.location,
        country: candidate.country,
        primaryCategoryCode: candidate.primaryCategory?.code,
        subCategoryCodes: candidateSubCategories,
      },
      {
        requiredSkills: job.requiredSkills,
        requiredExperienceYears: job.requiredExperienceYears,
        title: job.title,
        description: job.description,
        location: job.location,
        country: job.company?.country,
        categoryCode: job.jobCategory?.code,
        subCategoryCode: job.subCategory?.code,
      }
    );
    if (match.score < 25) {
      return NextResponse.json({ error: "La compatibilité a changé et se situe maintenant sous le seuil requis. Actualisez les propositions." }, { status: 409 });
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.missionPresentation.findFirst({
        where: {
          candidateId: candidate.id,
          missionId: job.id,
          companyId: job.companyId,
        },
        select: { id: true },
      });
      if (duplicate) return { conflict: "Ce profil est déjà présenté à cette entreprise pour cette mission." };

      const existingApplication = await tx.application.findFirst({
        where: { candidateId: candidate.id, jobId: job.id },
        select: { id: true, status: true },
      });
      if (existingApplication && ["REJECTED", "HIRED"].includes(existingApplication.status)) {
        return { conflict: "Ce dossier est clôturé et ne peut pas être présenté à nouveau depuis le matching." };
      }

      let applicationId: string;
      if (existingApplication) {
        applicationId = existingApplication.id;
        if (["SUBMITTED", "REVIEWING"].includes(existingApplication.status)) {
          await tx.application.update({
            where: { id: existingApplication.id },
            data: { status: "SHORTLISTED" },
          });
        }
      } else {
        const application = await tx.application.create({
          data: {
            candidateId: candidate.id,
            userId: candidate.userId,
            jobId: job.id,
            status: "SHORTLISTED",
            notes: "Présélection interne par Recrutement Privé après validation explicite du matching. Cette entrée ne constitue pas une candidature déposée par le candidat.",
          },
          select: { id: true },
        });
        applicationId = application.id;
      }

      const presentation = await tx.missionPresentation.create({
        data: {
          missionId: job.id,
          applicationId,
          candidateId: candidate.id,
          companyId: job.companyId,
          state: "MISSION_ACTIVE",
          anonymousMessagingEnabled: true,
          candidateAlias: candidateAlias(candidate.id),
          companyAlias: companyAlias(job.companyId),
          candidateUserId: candidate.userId,
          companyUserId: companyUser.id,
          financialConditionStatus: "PENDING",
          securityDetails: {
            identityProtected: true,
            directCoordinatesBlocked: true,
            createdFrom: "OWNER_MATCHING",
            matchingScore: match.score,
          },
        },
        select: { id: true, applicationId: true },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: access.userId,
          actorRole: access.role,
          action: "CANDIDATE_MATCH_PRESENTED",
          targetType: "MISSION_PRESENTATION",
          targetId: presentation.id,
          details: {
            source: "CV_MATCHING",
            score: match.score,
            candidateAlias: candidateAlias(candidate.id),
            companyAlias: companyAlias(job.companyId),
            applicationCreated: !existingApplication,
          },
        },
      });

      await tx.recruitmentHistory.create({
        data: {
          applicationId,
          jobId: job.id,
          actorUserId: access.userId,
          action: "CONNECT_MATCHMAKING",
          fromStatus: existingApplication?.status || null,
          toStatus: "SHORTLISTED",
          details: {
            presentationId: presentation.id,
            score: match.score,
          },
        },
      });

      return { presentationId: presentation.id, applicationId: presentation.applicationId };
    });

    if ("conflict" in outcome) {
      return NextResponse.json({ error: outcome.conflict }, { status: 409 });
    }
    return NextResponse.json({
      success: true,
      action: parsed.data.action,
      presentationId: outcome.presentationId,
      message: "Mise en relation confidentielle déclenchée avec succès. Les identités restent protégées ; aucun e-mail ni contact externe n’a été envoyé automatiquement.",
    }, { status: 201 });
  }

  if (parsed.data.action === "recalculate") {
    const { candidateId, jobId } = parsed.data;

    try {
      const [candidates, jobs] = await Promise.all([
        prisma.candidateProfile.findMany({
          where: {
            status: "ACTIVE",
            ...(candidateId ? { id: candidateId } : {}),
          },
          select: {
            id: true,
            headline: true,
            bio: true,
            skills: true,
            experienceYears: true,
            location: true,
            country: true,
            subCategoryIds: true,
            primaryCategory: { select: { code: true } },
          },
        }),
        prisma.job.findMany({
          where: {
            status: "OPEN",
            ...(jobId ? { id: jobId } : {}),
          },
          select: {
            id: true,
            title: true,
            location: true,
            company: { select: { country: true } },
            description: true,
            requiredSkills: true,
            requiredExperienceYears: true,
            jobCategory: { select: { code: true } },
            subCategory: { select: { code: true } },
          },
        }),
      ]);

      if (candidateId && candidates.length === 0) {
        return NextResponse.json({ error: "Le candidat actif demandé est introuvable." }, { status: 404 });
      }
      if (jobId && jobs.length === 0) {
        return NextResponse.json({ error: "L’offre ouverte demandée est introuvable." }, { status: 404 });
      }

      const allSubCategoryIds = [...new Set(candidates.flatMap((candidate) => stringIds(candidate.subCategoryIds)))];
      const subCategoryRows = allSubCategoryIds.length
        ? await prisma.jobCategory.findMany({
            where: { id: { in: allSubCategoryIds } },
            select: { id: true, code: true },
          })
        : [];
      const subCategoryCodeById = new Map(subCategoryRows.map((row) => [row.id, row.code]));

      let evaluatedPairs = 0;
      let eligibleMatches = 0;
      let highestScore = 0;
      const recalculatedAt = new Date().toISOString();

      for (const candidate of candidates) {
        const candidateSubCategories = stringIds(candidate.subCategoryIds)
          .map((id) => subCategoryCodeById.get(id))
          .filter((code): code is string => Boolean(code));

        for (const job of jobs) {
          const result = matchCandidateToJob(
            {
              skills: candidate.skills,
              experienceYears: candidate.experienceYears,
              headline: candidate.headline,
              bio: candidate.bio,
              location: candidate.location,
              country: candidate.country,
              primaryCategoryCode: candidate.primaryCategory?.code,
              subCategoryCodes: candidateSubCategories,
            },
            {
              requiredSkills: job.requiredSkills,
              requiredExperienceYears: job.requiredExperienceYears,
              title: job.title,
              description: job.description,
              location: job.location,
              country: job.company?.country,
              categoryCode: job.jobCategory?.code,
              subCategoryCode: job.subCategory?.code,
            }
          );
          evaluatedPairs += 1;
          if (result.score >= 25) eligibleMatches += 1;
          highestScore = Math.max(highestScore, result.score);
        }
      }

      await prisma.auditLog.create({
        data: {
          actorUserId: access.userId,
          actorRole: access.role,
          action: "CV_MATCHING_RECALCULATED",
          targetType: jobId ? "JOB" : candidateId ? "CANDIDATE" : "OVERVIEW",
          targetId: jobId || candidateId || "GLOBAL",
          details: {
            candidateId: candidateId || null,
            jobId: jobId || null,
            candidateCount: candidates.length,
            jobCount: jobs.length,
            evaluatedPairs,
            eligibleMatches,
            highestScore,
            recalculatedAt,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Recalcul du matching exécuté avec succès.",
        scope: jobId ? "JOB" : candidateId ? "CANDIDATE" : "GLOBAL",
        candidateCount: candidates.length,
        jobCount: jobs.length,
        evaluatedPairs,
        eligibleMatches,
        highestScore,
        recalculatedAt,
      });
    } catch (error) {
      console.error("[CV_MATCHING_RECALCULATED] Échec du recalcul", error);
      return NextResponse.json(
        { success: false, error: "Le recalcul du matching a échoué. Aucune réussite n’a été déclarée." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Action non prise en charge." }, { status: 400 });
}
