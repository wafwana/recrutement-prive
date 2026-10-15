import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";
import { z } from "zod";


const presentationSchema = z.object({
  action: z.literal("present"),
  candidateId: z.string().trim().min(1).max(128),
  jobId: z.string().trim().min(1).max(128),
});

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

async function subCategoryCodes(value: unknown) {
  const ids = stringIds(value);
  if (!ids.length) return [];
  const rows = await prisma.jobCategory.findMany({
    where: { id: { in: ids } },
    select: { id: true, code: true },
  });
  const byId = new Map(rows.map((row) => [row.id, row.code]));
  return ids.map((id) => byId.get(id)).filter((code): code is string => Boolean(code));
}

async function requireMatchingAccess() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
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
          applicationStatus: application?.status ?? null,
          presentationExists: Boolean(presentation),
          presentationState: presentation?.state ?? null,
        });
      }
    }

    ranked.sort((a, b) => b.score - a.score);
    return NextResponse.json({
      canPresent,
      candidateCount: candidates.length,
      jobCount: jobs.length,
      totalMatches: ranked.length,
      truncated: ranked.length > 100,
      suggestions: ranked.slice(0, 100),
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
  const canPresent = access.role === "OWNER" || (
    access.role === "ADMIN" &&
    await hasPermission(access.userId, access.role, "PRESENTATIONS_MANAGE")
  );
  if (!canPresent) {
    return NextResponse.json({ error: "La mise en relation est réservée à l’OWNER ou à un ADMIN explicitement habilité." }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }
  const parsed = presentationSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Candidat ou offre invalide." }, { status: 400 });
  }

  const [candidate, job] = await Promise.all([
    prisma.candidateProfile.findFirst({
      where: { id: parsed.data.candidateId, status: "ACTIVE" },
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
      where: { id: parsed.data.jobId, status: "OPEN" },
      select: {
        id: true,
        title: true,
        companyId: true,
        location: true,
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

  const [candidateSubCategories, companyUser] = await Promise.all([
    subCategoryCodes(candidate.subCategoryIds),
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
    return { presentationId: presentation.id, applicationId: presentation.applicationId };
  });

  if ("conflict" in outcome) {
    return NextResponse.json({ error: outcome.conflict }, { status: 409 });
  }
  return NextResponse.json({
    success: true,
    presentationId: outcome.presentationId,
    message: "Présentation confidentielle créée. Les identités restent protégées ; aucun email ni contact externe n’a été envoyé automatiquement.",
  }, { status: 201 });
}
