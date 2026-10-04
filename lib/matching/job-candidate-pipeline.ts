import { prisma } from "@/lib/prisma";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";

export async function matchOpenJobCandidates(jobId: string, actorUserId: string, actorRole: string, limit = 250) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true, status: true, title: true, description: true, location: true,
      requiredSkills: true, requiredExperienceYears: true, jobCategoryId: true,
      subCategoryId: true,
    },
  });
  if (!job || job.status !== "OPEN") return { evaluated: 0, matches: 0 };

  const [candidates, categories] = await Promise.all([
    prisma.candidateProfile.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true, skills: true, experienceYears: true, headline: true, bio: true,
        location: true, country: true, primaryCategoryId: true, subCategoryIds: true,
      },
      take: Math.min(Math.max(limit, 1), 250),
    }),
    prisma.jobCategory.findMany({ select: { id: true, code: true } }),
  ]);

  const codes = new Map(categories.map((row) => [row.id, row.code]));
  const scored = candidates.map((candidate) => {
    const result = matchCandidateToJob(
      {
        skills: candidate.skills,
        experienceYears: candidate.experienceYears,
        headline: candidate.headline,
        bio: candidate.bio,
        location: candidate.location,
        country: candidate.country,
        primaryCategoryCode: candidate.primaryCategoryId ? codes.get(candidate.primaryCategoryId) : undefined,
        subCategoryCodes: Array.isArray(candidate.subCategoryIds) ? candidate.subCategoryIds : [],
      },
      {
        requiredSkills: job.requiredSkills,
        requiredExperienceYears: job.requiredExperienceYears,
        title: job.title,
        description: job.description,
        location: job.location,
        categoryCode: job.jobCategoryId ? codes.get(job.jobCategoryId) : undefined,
        subCategoryCode: job.subCategoryId ? codes.get(job.subCategoryId) : undefined,
      },
    );
    return { candidateId: candidate.id, score: result.score, matchedSkills: result.matchedSkills, missingSkills: result.missingSkills, categoryMatchLevel: result.categoryMatchLevel, reasons: result.reasons };
  }).filter((match) => match.score >= 25).sort((a, b) => b.score - a.score).slice(0, 20);

  await prisma.auditLog.create({
    data: {
      actorUserId,
      actorRole,
      action: "JOB_IMMEDIATE_MATCHING",
      targetType: "JOB",
      targetId: job.id,
      details: { evaluated: candidates.length, matches: scored.length, topMatches: scored, humanValidated: false },
    },
  });

  return { evaluated: candidates.length, matches: scored.length };
}
