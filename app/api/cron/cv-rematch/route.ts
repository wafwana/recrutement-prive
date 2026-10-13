import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";
import { analyzeCvDocument } from "@/lib/cv/analyzer";
import { buildCandidateFolderFromAnalysis, resolveCvTaxonomySelection } from "@/lib/cv/folders";
import { readBatchOffset, writeBatchOffset } from "@/lib/sourcing/batch-state";
import { selectBatchWindow } from "@/lib/sourcing/batch-window";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const candidateWhere = {
    status: "ACTIVE" as const,
    documents: { some: { docType: "CV" as const } },
  };
  const candidateSourceTotal = await prisma.candidateProfile.count({ where: candidateWhere });
  const candidateBatchKey = "cv-rematch:candidates";
  const candidateOffset = await readBatchOffset(candidateBatchKey, candidateSourceTotal);
  const candidateBatchLimit = 10;
  const candidateWindow = selectBatchWindow(candidateSourceTotal, candidateOffset, candidateBatchLimit);
  const candidateBatch = candidateWindow.take > 0
    ? await prisma.candidateProfile.findMany({
        where: candidateWhere,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: candidateWindow.skip,
        take: candidateWindow.take,
        include: {
          primaryCategory: { select: { code: true } },
          documents: {
            where: { docType: "CV" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, analysis: true },
          },
        },
      })
    : [];

  const jobs = await prisma.job.findMany({
    where: { status: "OPEN" },
    include: {
      jobCategory: { select: { code: true } },
      subCategory: { select: { code: true } },
    },
    take: 200,
  });

  const externalOffers = await prisma.externalJobOpportunity.findMany({ where: { status: { not: "REJECTED" } }, orderBy: { sourceCollectedAt: "desc" }, take: 500 });

  const intakeQueue = await prisma.cvIntake.findMany({
    where: { status: "A_ANALYSER" },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  let intakeAnalyzed = 0;
  let intakeMatched = 0;

  const categoryRows = await prisma.jobCategory.findMany({ select: { id: true, code: true, name: true, parentId: true } });
  const categoryCodes = new Map(categoryRows.map((row) => [row.id, row.code]));
  const taxonomyItems = categoryRows.map((row) => ({
    code: row.code,
    name: typeof row.name === "object" && row.name !== null && "fr" in row.name
      ? String((row.name as Record<string, unknown>).fr || row.code)
      : typeof row.name === "string" ? row.name : row.code,
    parentCode: row.parentId ? categoryCodes.get(row.parentId) || null : null,
  }));

  let updated = 0;
  for (const intake of intakeQueue) {


    try {
      const analysis = await analyzeCvDocument({
        fileName: intake.originalName,
        mimeType: intake.mimeType,
        buffer: Buffer.from(intake.fileData),
        taxonomy: taxonomyItems,
      });
      if (!analysis) {
        await prisma.cvIntake.update({
          where: { id: intake.id },
          data: {
            status: "NON_ANALYSE",
            analysis: { error: "Aucun fournisseur IA disponible ou rejeté par règles de confidentialité." },
          },
        });
        continue;
      }

      const taxonomySelection = resolveCvTaxonomySelection(analysis, taxonomyItems);
      const primary = taxonomySelection.primaryCategoryCode
        ? categoryRows.find((row) => row.code === taxonomySelection.primaryCategoryCode && row.parentId === null)
        : null;
      const subCategories = categoryRows.filter((row) => taxonomySelection.subCategoryCodes.includes(row.code));
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

      const suggestedFolder = buildCandidateFolderFromAnalysis(
        analysis,
        taxonomyItems,
        intake.createdAt.getFullYear(),
        "CV",
      );

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


  // Reclassify previously analyzed intake records that still use the generic
  // folder. Cursor over the stable ANALYSE_OK set so unresolved records cannot
  // starve later records; only generic folders are changed, preserving manual
  // folder assignments and the original file bytes.
  const reclassificationWhere = { status: "ANALYSE_OK" };
  const reclassificationTotal = await prisma.cvIntake.count({ where: reclassificationWhere });
  const reclassificationKey = "cv-intake:folder-reclassification";
  const reclassificationOffset = await readBatchOffset(reclassificationKey, reclassificationTotal);
  const reclassificationQueue = reclassificationTotal > 0
    ? await prisma.cvIntake.findMany({
        where: reclassificationWhere,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: reclassificationOffset,
        take: 10,
        select: { id: true, analysis: true, createdAt: true, candidateId: true, originalName: true, folderPath: true },
      })
    : [];
  let foldersReclassified = 0;

  for (const intake of reclassificationQueue) {
    if (!intake.folderPath.startsWith("CANDIDATS/A_CLASSER")) continue;
    const suggestedFolder = buildCandidateFolderFromAnalysis(
      intake.analysis,
      taxonomyItems,
      intake.createdAt.getFullYear(),
      "CV",
    );
    if (suggestedFolder === intake.folderPath || suggestedFolder.startsWith("CANDIDATS/A_CLASSER/")) continue;

    await prisma.cvIntake.update({
      where: { id: intake.id },
      data: { folderPath: suggestedFolder },
    });
    if (intake.candidateId) {
      await prisma.candidateDocument.updateMany({
        where: { candidateId: intake.candidateId, name: intake.originalName, docType: "CV" },
        data: { folderPath: suggestedFolder },
      });
    }
    foldersReclassified++;
  }

  if (reclassificationTotal > 0 && reclassificationQueue.length > 0) {
    await writeBatchOffset(reclassificationKey, reclassificationOffset + reclassificationQueue.length, reclassificationTotal);
  }




  for (const candidate of candidateBatch) {
    const subCategoryCodes = Array.isArray(candidate.subCategoryIds)
      ? candidate.subCategoryIds
          .filter((value): value is string => typeof value === "string")
          .map((value) => categoryCodes.get(value) || value)
      : [];

    const matches = [
      ...jobs.map((job) => {
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
      }),
      ...externalOffers.map((offer) => {
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
            requiredSkills: offer.skills,
            requiredExperienceYears: offer.experienceYears,
            title: offer.title,
            description: offer.description,
            location: [offer.city, offer.country].filter(Boolean).join(", ") || null,
            categoryCode: offer.categoryCode,
            subCategoryCode: offer.subCategoryCode,
          },
        );
        return {
          externalJobId: offer.id,
          title: offer.title,
          score: result.score,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
          categoryMatchLevel: result.categoryMatchLevel,
          source: offer.source,
        };
      }),
    ]
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
        details: { candidatesChecked: candidateBatch.length, candidateSourceTotal, openJobs: jobs.length, externalOffers: externalOffers.length, documentsUpdated: updated, intakeAnalyzed, intakeMatched, foldersReclassified },
      },
    });
  }

  if (candidateSourceTotal > 0 && candidateBatch.length > 0) {
    await writeBatchOffset(candidateBatchKey, candidateOffset + candidateBatch.length, candidateSourceTotal);
  }

  return NextResponse.json({ ok: true, candidatesChecked: candidateBatch.length, candidateSourceTotal, openJobs: jobs.length, externalOffers: externalOffers.length, documentsUpdated: updated, intakeAnalyzed, intakeMatched, foldersReclassified });
}
