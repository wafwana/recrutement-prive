import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";

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

  if (mode === "jobs") {
    const jobs = await prisma.job.findMany({
      where: { status: "OPEN" },
      select: { id: true, title: true, location: true, company: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    return NextResponse.json({ jobs });
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
        company: { select: { name: true } },
        jobCategory: { select: { code: true } },
        subCategory: { select: { code: true } },
      },
    });
    if (!job) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });

    const candidates = await prisma.candidateProfile.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: { select: { name: true, email: true } },
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
          name: candidate.user.name,
          email: candidate.user.email,
          headline: candidate.headline,
          location: candidate.location,
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
      job: { id: job.id, title: job.title, location: job.location, companyName: job.company.name },
      matches,
    });
  }
  if (!candidateId) return NextResponse.json({ error: "candidateId requis." }, { status: 400 });

  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: candidateId },
    include: { user: { select: { name: true, email: true } }, primaryCategory: { select: { code: true } } },
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
      company: { select: { name: true } },
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
        companyName: job.company.name,
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
      name: candidate.user.name,
      email: candidate.user.email,
      headline: candidate.headline,
      skills: candidate.skills,
      experienceYears: candidate.experienceYears,
      primaryCategoryCode: candidate.primaryCategory?.code ?? null,
      subCategoryCodes,
    },
    matches,
  });
}
