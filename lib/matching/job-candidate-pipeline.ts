import { prisma } from "@/lib/prisma";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";

export async function matchOpenJobCandidates(jobId: string, actorUserId: string, actorRole: string, limit = 250) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      title: true,
      description: true,
      location: true,
      requiredSkills: true,
      requiredExperienceYears: true,
      jobCategoryId: true,
      subCategoryId: true,
    },
  });
  if (!job || job.status !== "OPEN") return { evaluated: 0, matches: 0, updatedDocuments: 0 };

  const [candidates, categories, jobCategory, subCategory] = await Promise.all([
    prisma.candidateProfile.findMany({
      where: { status: "ACTIVE", documents: { some: { docType: "CV" } } },
      select: {
        id: true,
        skills: true,
        experienceYears: true,
        headline: true,
        bio: true,
        location: true,
        country: true,
        primaryCategory: { select: { code: true } },
        subCategoryIds: true,
        documents: {
          where: { docType: "CV" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, analysis: true },
        },
      },
      take: Math.min(Math.max(limit, 1), 250),
    }),
    prisma.jobCategory.findMany({ select: { id: true, code: true } }),
    job.jobCategoryId ? prisma.jobCategory.findUnique({ where: { id: job.jobCategoryId }, select: { code: true } }) : null,
    job.subCategoryId ? prisma.jobCategory.findUnique({ where: { id: job.subCategoryId }, select: { code: true } }) : null,
  ]);

  const codes = new Map(categories.map((row) => [row.id, row.code]));
  let updatedDocuments = 0;
  const scored = [];

  for (const candidate of candidates) {
    const document = candidate.documents[0];
    if (!document) continue;

    const subCategoryCodes = Array.isArray(candidate.subCategoryIds)
      ? candidate.subCategoryIds.filter((value): value is string => typeof value === "string").map((value) => codes.get(value) || value)
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
        categoryCode: jobCategory?.code,
        subCategoryCode: subCategory?.code,
      },
    );

    if (result.score >= 25) {
      scored.push({
        candidateId: candidate.id,
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        categoryMatchLevel: result.categoryMatchLevel,
        reasons: result.reasons,
      });
    }

    const previous = document.analysis && typeof document.analysis === "object" && !Array.isArray(document.analysis)
      ? document.analysis as Record<string, unknown>
      : {};
    const previousMatches = Array.isArray(previous.suggestedMatches) ? previous.suggestedMatches : [];
    const withoutThisJob = previousMatches.filter(
      (item) => !item || typeof item !== "object" || (item as Record<string, unknown>).jobId !== job.id,
    );
    const suggestedMatches = [
      ...withoutThisJob,
      {
        jobId: job.id,
        title: job.title,
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        categoryMatchLevel: result.categoryMatchLevel,
      },
    ]
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
    updatedDocuments++;
  }

  const topMatches = scored.sort((a, b) => b.score - a.score).slice(0, 20);
  await prisma.auditLog.create({
    data: {
      actorUserId,
      actorRole,
      action: "JOB_IMMEDIATE_MATCHING",
      targetType: "JOB",
      targetId: job.id,
      details: {
        evaluated: candidates.length,
        matches: topMatches.length,
        updatedDocuments,
        topMatches,
        humanValidated: false,
        applicationsCreated: 0,
        contactsCreated: 0,
      },
    },
  });

  return { evaluated: candidates.length, matches: topMatches.length, updatedDocuments };
}