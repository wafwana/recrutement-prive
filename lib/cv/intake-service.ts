import { prisma } from "@/lib/prisma";
import { analyzeCvDocument } from "@/lib/cv/analyzer";
import { buildCandidateFolder } from "@/lib/cv/folders";

function scoreJob(
  analysis: Awaited<ReturnType<typeof analyzeCvDocument>>,
  job: { id: string; title: string; requiredSkills: unknown; requiredExperienceYears: number | null; jobCategoryId: string | null; subCategoryId: string | null }
) {
  if (!analysis) return 0;
  const candidateSkills = new Set(analysis.skills.map((skill) => skill.toLowerCase()));
  const required = Array.isArray(job.requiredSkills) ? job.requiredSkills.filter((v): v is string => typeof v === "string") : [];
  const skillHits = required.filter((skill) => [...candidateSkills].some((candidate) => candidate.includes(skill.toLowerCase()) || skill.toLowerCase().includes(candidate))).length;
  const skillScore = required.length ? Math.round((skillHits / required.length) * 60) : 0;
  const experienceScore = job.requiredExperienceYears == null || analysis.experienceYears == null
    ? 0
    : analysis.experienceYears >= job.requiredExperienceYears ? 25 : Math.max(0, Math.round((analysis.experienceYears / Math.max(1, job.requiredExperienceYears)) * 25));
  const titleScore = analysis.headline && job.title
    ? analysis.headline.toLowerCase().split(/\W+/).filter(Boolean).some((word) => job.title.toLowerCase().includes(word)) ? 15 : 0
    : 0;
  return Math.min(100, skillScore + experienceScore + titleScore);
}

export async function processCvIntakeAnalysis(docId: string, actorUserId: string, actorRole: string) {
  const doc = await prisma.cvIntake.findUnique({
    where: { id: docId },
    select: { id: true, name: true, mimeType: true, fileData: true, candidateId: true, folderPath: true },
  });
  if (!doc) return null;

  const taxonomy = await prisma.jobCategory.findMany({
    where: { isActive: true },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    select: { id: true, code: true, name: true, parentId: true },
  });
  const taxonomyItems = taxonomy.map((item) => ({
    code: item.code,
    name: typeof item.name === "object" && item.name !== null && "fr" in item.name ? String((item.name as Record<string, unknown>).fr || item.code) : item.code,
    parentCode: taxonomy.find((parent) => parent.id === item.parentId)?.code || null,
  }));

  let analysis: Awaited<ReturnType<typeof analyzeCvDocument>> = null;
  let analysisError: string | null = null;

  try {
    analysis = await analyzeCvDocument({
      fileName: doc.name,
      mimeType: doc.mimeType || "application/octet-stream",
      buffer: Buffer.from(doc.fileData),
      taxonomy: taxonomyItems,
    });
  } catch (error) {
    analysisError = error instanceof Error ? error.message : "Erreur d'analyse IA";
    console.error(`[cv intake analyze] ${docId}:`, error);
  }

  const jobs = await prisma.job.findMany({
    where: { status: "OPEN" },
    take: 500,
    select: { id: true, title: true, requiredSkills: true, requiredExperienceYears: true, jobCategoryId: true, subCategoryId: true },
  });
  const suggestedMatches = jobs
    .map((job) => ({ jobId: job.id, title: job.title, score: scoreJob(analysis, job), categoryId: job.jobCategoryId, subCategoryId: job.subCategoryId }))
    .filter((item) => item.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const year = new Date().getFullYear();
  const folderPath = analysis
    ? buildCandidateFolder({
        sectorCode: analysis.primaryCategoryCode,
        professionCode: analysis.subCategoryCodes[0] || "A_VERIFIER",
        year,
        documentKind: "CV",
      })
    : doc.folderPath;

  const updated = await prisma.cvIntake.update({
    where: { id: doc.id },
    data: {
      folderPath,
      analysis: analysis ? { ...analysis, sourceFactsOnly: true, suggestedMatches } : { sourceFactsOnly: true, suggestedMatches },
      matching: { suggestedMatches, generatedAt: new Date().toISOString() },
      analyzedAt: analysis ? new Date() : null,
      status: analysis ? "ANALYSE_OK" : "A_ANALYSER",
    },
    select: {
      id: true,
      name: true,
      folderPath: true,
      analysis: true,
      matching: true,
      analyzedAt: true,
      status: true,
    },
  });

  if (doc.candidateId && analysis) {
    const existingCandidateDoc = await prisma.candidateDocument.findFirst({
      where: { candidateId: doc.candidateId, docType: "CV" },
      select: { id: true },
    });

    if (existingCandidateDoc) {
      await prisma.candidateDocument.update({
        where: { id: existingCandidateDoc.id },
        data: {
          folderPath,
          analysis: { ...analysis, sourceFactsOnly: true, suggestedMatches },
          analyzedAt: new Date(),
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId,
      actorRole,
      action: "CV_REAL_ANALYZE",
      targetType: "CV_INTAKE",
      targetId: doc.id,
      details: {
        docName: doc.name,
        analysisGenerated: Boolean(analysis),
        analysisDeferred: Boolean(analysisError),
        suggestedMatchCount: suggestedMatches.length,
      },
    },
  });

  return updated;
}
