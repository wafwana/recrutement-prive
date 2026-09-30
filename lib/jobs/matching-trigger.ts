import { prisma } from "@/lib/prisma";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";

export async function triggerJobCandidateMatching(jobId: string): Promise<{ matchedCandidates: number; jobId: string }> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      requiredSkills: true,
      requiredExperienceYears: true,
      status: true,
      jobCategoryId: true,
      subCategoryId: true,
      jobCategory: { select: { code: true } },
      subCategory: { select: { code: true } },
    },
  });

  if (!job || job.status !== "OPEN") {
    return { matchedCandidates: 0, jobId };
  }

  const [candidates, categories] = await Promise.all([
    prisma.candidateProfile.findMany({
      where: {
        status: "ACTIVE",
        user: { status: "ACTIVE" },
        documents: { some: { docType: "CV" } },
      },
      include: {
        primaryCategory: { select: { code: true } },
        documents: {
          where: { docType: "CV" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, analysis: true },
        },
      },
      take: 1000,
    }),
    prisma.jobCategory.findMany({ select: { id: true, code: true } }),
  ]);

  const categoryCodes = new Map(categories.map((row) => [row.id, row.code]));

  let matchedCandidates = 0;

  for (const candidate of candidates) {
    const document = candidate.documents[0];
    if (!document) continue;

    const subCategoryCodes = Array.isArray(candidate.subCategoryIds)
      ? candidate.subCategoryIds
          .filter((value): value is string => typeof value === "string")
          .map((value) => categoryCodes.get(value) || value)
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

    const previous =
      document.analysis && typeof document.analysis === "object" && !Array.isArray(document.analysis)
        ? (document.analysis as Record<string, unknown>)
        : {};

    const previousMatches = Array.isArray(previous.suggestedMatches) ? previous.suggestedMatches : [];
    const withoutThisJob = previousMatches.filter(
      (item) => !item || typeof item !== "object" || (item as Record<string, unknown>).jobId !== job.id
    );

    const newMatch = {
      jobId: job.id,
      title: job.title,
      score: result.score,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      categoryMatchLevel: result.categoryMatchLevel,
    };

    const suggestedMatches = [...withoutThisJob, newMatch]
      .sort((a, b) => Number((b as Record<string, unknown>).score ?? 0) - Number((a as Record<string, unknown>).score ?? 0))
      .slice(0, 20);

    await prisma.candidateDocument.update({
      where: { id: document.id },
      data: {
        analysis: {
          ...previous,
          suggestedMatches,
          rematchedAt: new Date().toISOString(),
        },
      },
    });

    matchedCandidates++;
  }

  return { matchedCandidates, jobId: job.id };
}
