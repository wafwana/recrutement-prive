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
  if (!(await hasPermission(userId, role, "MATCHING"))) return null;
  return { userId, role };
}

export async function GET(request: Request) {
  const access = await requireMatchingAccess();
  if (!access) return NextResponse.json({ error: "Permission de matching non accordée par l'Owner." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get("candidateId")?.trim();
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
