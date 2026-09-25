import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const candidates = await prisma.candidateProfile.findMany({
    where: {
      status: "ACTIVE",
      documents: { some: { docType: "CV", isPrimaryCv: true } },
    },
    include: {
      primaryCategory: { select: { code: true } },
      documents: {
        where: { docType: "CV", isPrimaryCv: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, analysis: true },
      },
    },
  });

  const jobs = await prisma.job.findMany({
    where: { status: "OPEN" },
    include: {
      jobCategory: { select: { code: true } },
      subCategory: { select: { code: true } },
    },
    take: 1000,
  });

  const externalOffers = await prisma.externalJobOpportunity.findMany({ where: { status: { not: "REJECTED" } }, take: 5000 });

  const categoryRows = await prisma.jobCategory.findMany({ select: { id: true, code: true } });
  const categoryCodes = new Map(categoryRows.map((row) => [row.id, row.code]));

  let updated = 0;

  for (const candidate of candidates) {
    const subCategoryCodes = Array.isArray(candidate.subCategoryIds)
      ? candidate.subCategoryIds
          .filter((value): value is string => typeof value === "string")
          .map((value) => categoryCodes.get(value) || value)
      : [];

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
          score: result.score,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
          categoryMatchLevel: result.categoryMatchLevel,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const document = candidate.documents[0];
    if (!document) continue;

    const existingAnalysis =
      document.analysis && typeof document.analysis === "object" && !Array.isArray(document.analysis)
        ? document.analysis as Record<string, unknown>
        : {};

    await prisma.candidateDocument.update({
      where: { id: document.id },
      data: {
        analysis: {
          ...existingAnalysis,
          suggestedMatches: matches,
          rematchedAt: new Date().toISOString(),
        },
      },
    });

    updated++;
  }

  const owner = await prisma.user.findFirst({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
  if (owner) {
    await prisma.auditLog.create({
      data: {
        actorUserId: owner.id,
        actorRole: "SYSTEM",
        action: "CV_AUTOMATIC_REMATCH",
        targetType: "CV_LIBRARY",
        details: { candidatesChecked: candidates.length, openJobs: jobs.length, externalOffers: externalOffers.length, documentsUpdated: updated },
      },
    });
  }

  return NextResponse.json({ ok: true, candidatesChecked: candidates.length, openJobs: jobs.length, externalOffers: externalOffers.length, documentsUpdated: updated });
}
