import { prisma } from "@/lib/prisma";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";
import { analyzeJobOffer } from "@/lib/jobs/analyzer";

export async function analyzeAndMatchJob(input: {
  jobId: string;
  actorUserId: string;
  actorRole: string;
}) {
  const job = await prisma.job.findUnique({
    where: { id: input.jobId },
    include: {
      company: { select: { id: true, name: true } },
      jobCategory: { select: { id: true, code: true, name: true, parentId: true } },
      subCategory: { select: { id: true, code: true, name: true, parentId: true } },
    },
  });
  if (!job) throw new Error("Offre introuvable.");

  const taxonomy = await prisma.jobCategory.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, parentId: true },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
  });
  const taxonomyItems = taxonomy.map((row) => ({
    code: row.code,
    name: typeof row.name === "object" && row.name !== null && "fr" in row.name
      ? String((row.name as Record<string, unknown>).fr || row.code)
      : row.code,
    parentCode: taxonomy.find((parent) => parent.id === row.parentId)?.code || null,
  }));

  const analysis = await analyzeJobOffer({
    title: job.title,
    description: job.description,
    location: job.location,
    missionType: job.missionType,
    requiredSkills: job.requiredSkills,
    requiredExperienceYears: job.requiredExperienceYears,
    taxonomy: taxonomyItems,
  });

  const currentSkills = Array.isArray(job.requiredSkills)
    ? job.requiredSkills.filter((value): value is string => typeof value === "string")
    : [];

  const aiCategory = analysis?.categoryCode
    ? taxonomy.find((row) => row.code === analysis.categoryCode && row.parentId === null)
    : undefined;
  const aiSubCategory = analysis?.subCategoryCode
    ? taxonomy.find((row) => row.code === analysis.subCategoryCode && row.parentId === aiCategory?.id)
    : undefined;

  const finalCategoryId = job.jobCategoryId || aiCategory?.id || null;
  const finalSubCategoryId = job.subCategoryId || aiSubCategory?.id || null;
  const finalSkills = currentSkills.length ? currentSkills : (analysis?.skills || []);
  const finalExperience = job.requiredExperienceYears ?? analysis?.experienceYears ?? null;
  const finalLocation = job.location || analysis?.location || null;
  const finalMissionType = job.missionType || analysis?.missionType || null;
  const finalDescription = job.description || analysis?.description || null;

  await prisma.job.update({
    where: { id: job.id },
    data: {
      requiredSkills: finalSkills,
      requiredExperienceYears: finalExperience,
      location: finalLocation,
      missionType: finalMissionType,
      description: finalDescription,
      jobCategoryId: finalCategoryId,
      subCategoryId: finalSubCategoryId,
    },
  });

  const candidates = await prisma.candidateProfile.findMany({
    where: { status: "ACTIVE" },
    include: {
      primaryCategory: { select: { code: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    take: 5000,
  });

  const categoryCodes = new Map(taxonomy.map((row) => [row.id, row.code]));
  const matches = candidates
    .map((candidate) => {
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
          requiredSkills: finalSkills,
          requiredExperienceYears: finalExperience,
          title: job.title,
          description: finalDescription,
          location: finalLocation,
          categoryCode: aiCategory?.code || job.jobCategory?.code || null,
          subCategoryCode: aiSubCategory?.code || job.subCategory?.code || null,
        },
      );

      return {
        candidateId: candidate.id,
        userId: candidate.user.id,
        candidateName: candidate.user.name,
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        reasons: result.reasons,
        categoryMatchLevel: result.categoryMatchLevel,
      };
    })
    .filter((match) => match.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  await prisma.recruitmentHistory.create({
    data: {
      jobId: job.id,
      actorUserId: input.actorUserId,
      action: "JOB_AI_ANALYSIS_AND_MATCHING",
      toStatus: job.status,
      details: {
        source: "OWNER_MANUAL_ENTRY",
        aiEnabled: Boolean(analysis),
        analysis: analysis || null,
        enrichedFields: {
          categoryId: finalCategoryId,
          subCategoryId: finalSubCategoryId,
          skills: finalSkills,
          experienceYears: finalExperience,
          location: finalLocation,
          missionType: finalMissionType,
          description: finalDescription,
        },
        matches,
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: "JOB_AI_ANALYSIS_AND_MATCHING",
      targetType: "Job",
      targetId: job.id,
      details: {
        companyId: job.companyId,
        aiEnabled: Boolean(analysis),
        matchCount: matches.length,
        topScore: matches[0]?.score ?? null,
      },
    },
  });

  return {
    jobId: job.id,
    companyId: job.companyId,
    aiEnabled: Boolean(analysis),
    analysis,
    matchCount: matches.length,
    matches,
  };
}
