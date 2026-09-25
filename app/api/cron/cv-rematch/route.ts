import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";
import { analyzeCvDocument } from "@/lib/cv/analyzer";
import { buildCandidateFolder } from "@/lib/cv/folders";

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

  const intakeQueue = await prisma.cvIntake.findMany({
    where: { status: "A_ANALYSER" },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  let intakeAnalyzed = 0;
  let intakeMatched = 0;

  const categoryRows = await prisma.jobCategory.findMany({ select: { id: true, code: true } });
  const categoryCodes = new Map(categoryRows.map((row) => [row.id, row.code]));

  let updated = 0;
  for (const intake of intakeQueue) {
    if (!process.env.OPENAI_API_KEY) break;

    const taxonomy = await prisma.jobCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, parentId: true },
    });
    const taxonomyItems = taxonomy.map((row) => ({
      code: row.code,
      name: typeof row.name === "object" && row.name !== null && "fr" in row.name
        ? String((row.name as Record<string, unknown>).fr || row.code)
        : row.code,
      parentCode: taxonomy.find((parent) => parent.id === row.parentId)?.code || null,
    }));

    try {
      const analysis = await analyzeCvDocument({
        fileName: intake.originalName,
        mimeType: intake.mimeType,
        buffer: Buffer.from(intake.fileData),
        taxonomy: taxonomyItems,
      });
      if (!analysis) continue;

      const primary = taxonomy.find((row) => row.code === analysis.primaryCategoryCode && row.parentId === null);
      const subCategories = taxonomy.filter((row) => analysis.subCategoryCodes.includes(row.code) && row.parentId);
      const categoryMap = new Map(taxonomy.map((row) => [row.code, row.id]));
      const candidateMatches = [
        ...jobs.map((job) => {
          const result = matchCandidateToJob(
            {
              skills: analysis.skills,
              experienceYears: analysis.experienceYears,
              headline: analysis.headline,
              bio: analysis.improvedSummary || analysis.summary,
              primaryCategoryCode: analysis.primaryCategoryCode,
              subCategoryCodes: analysis.subCategoryCodes,
            },
            {
              requiredSkills: job.requiredSkills,
              requiredExperienceYears: job.requiredExperienceYears,
              title: job.title,
              description: job.description,
              location: job.location,
              categoryCode: job.jobCategory?.code,
              subCategoryCode: job.subCategory?.code,
            },
          );
          return { jobId: job.id, title: job.title, score: result.score, matchedSkills: result.matchedSkills, missingSkills: result.missingSkills, categoryMatchLevel: result.categoryMatchLevel };
        }),
        ...externalOffers.map((offer) => {
          const result = matchCandidateToJob(
            {
              skills: analysis.skills,
              experienceYears: analysis.experienceYears,
              headline: analysis.headline,
              bio: analysis.improvedSummary || analysis.summary,
              primaryCategoryCode: analysis.primaryCategoryCode,
              subCategoryCodes: analysis.subCategoryCodes,
            },
            {
              requiredSkills: offer.skills,
              requiredExperienceYears: offer.experienceYears,
              title: offer.title,
              description: offer.description,
              location: [offer.city, offer.country].filter(Boolean).join(", ") || null,
              categoryCode: offer.categoryCode,
              subCategoryCode: offer.subCategoryCode,
            },
          );
          return { externalJobId: offer.id, title: offer.title, score: result.score, matchedSkills: result.matchedSkills, missingSkills: result.missingSkills, categoryMatchLevel: result.categoryMatchLevel, source: offer.source };
        }),
      ].filter((item) => item.score >= 25).sort((a, b) => b.score - a.score).slice(0, 20);

      const suggestedFolder = buildCandidateFolder({
        sectorCode: analysis.primaryCategoryCode,
        professionCode: analysis.subCategoryCodes[0] || "A_VERIFIER",
        year: intake.createdAt.getFullYear(),
        documentKind: "CV",
      });

      await prisma.cvIntake.update({
        where: { id: intake.id },
        data: {
          analysis: { ...analysis, sourceFactsOnly: true, suggestedMatches: candidateMatches },
          matching: { suggestedMatches: candidateMatches, generatedAt: new Date().toISOString() },
          analyzedAt: new Date(),
          status: "ANALYSE_OK",
          folderPath: suggestedFolder,
        },
      });

      if (intake.candidateId) {
        await prisma.candidateProfile.update({
          where: { id: intake.candidateId },
          data: {
            headline: analysis.headline || undefined,
            bio: analysis.improvedSummary || analysis.summary || undefined,
            skills: analysis.skills,
            experienceYears: analysis.experienceYears,
            primaryCategoryId: primary?.id || undefined,
            subCategoryIds: subCategories.map((row) => row.id),
          },
        });
        const existingDoc = await prisma.candidateDocument.findFirst({
          where: { candidateId: intake.candidateId, name: intake.originalName, docType: "CV" },
          select: { id: true },
        });
        if (existingDoc) {
          await prisma.candidateDocument.update({
            where: { id: existingDoc.id },
            data: { analysis: { ...analysis, sourceFactsOnly: true, suggestedMatches: candidateMatches }, analyzedAt: new Date(), folderPath: suggestedFolder, isPrimaryCv: true },
          });
        } else {
          await prisma.candidateDocument.create({
            data: {
              candidateId: intake.candidateId,
              name: intake.originalName,
              fileData: intake.fileData,
              type: intake.mimeType,
              docType: "CV",
              folderPath: suggestedFolder,
              analysis: { ...analysis, sourceFactsOnly: true, suggestedMatches: candidateMatches },
              analyzedAt: new Date(),
              isPrimaryCv: true,
            },
          });
        }
      }

      intakeAnalyzed++;
      intakeMatched += candidateMatches.length;
    } catch (error) {
      console.error("[cv-rematch intake]", intake.id, error);
    }
  }



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
        details: { candidatesChecked: candidates.length, openJobs: jobs.length, externalOffers: externalOffers.length, documentsUpdated: updated, intakeAnalyzed, intakeMatched },
      },
    });
  }

  return NextResponse.json({ ok: true, candidatesChecked: candidates.length, openJobs: jobs.length, externalOffers: externalOffers.length, documentsUpdated: updated, intakeAnalyzed, intakeMatched });
}
