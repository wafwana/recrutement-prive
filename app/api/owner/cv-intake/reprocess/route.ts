import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromCvBuffer, parseCvTextLocally } from "@/lib/cv/analyzer";
import { hasPermission } from "@/lib/auth/permissions";

function scoreJob(
  analysis: ReturnType<typeof parseCvTextLocally>,
  job: { id: string; title: string; requiredSkills: unknown; requiredExperienceYears: number | null },
) {
  const candidateSkills = new Set(analysis.skills.map((skill) => skill.toLowerCase()));
  const required = Array.isArray(job.requiredSkills)
    ? job.requiredSkills.filter((value): value is string => typeof value === "string")
    : [];
  const skillHits = required.filter((skill) =>
    [...candidateSkills].some((candidate) =>
      candidate.includes(skill.toLowerCase()) || skill.toLowerCase().includes(candidate),
    ),
  ).length;
  const skillScore = required.length ? Math.round((skillHits / required.length) * 60) : 0;
  const experienceScore =
    job.requiredExperienceYears == null || analysis.experienceYears == null
      ? 0
      : analysis.experienceYears >= job.requiredExperienceYears
        ? 25
        : Math.max(0, Math.round((analysis.experienceYears / Math.max(1, job.requiredExperienceYears)) * 25));
  const titleScore =
    analysis.headline && job.title &&
    analysis.headline.toLowerCase().split(/\W+/).filter(Boolean).some((word) => job.title.toLowerCase().includes(word))
      ? 15
      : 0;
  return Math.min(100, skillScore + experienceScore + titleScore);
}

/**
 * Retry failed CV intake records using local deterministic parsing only.
 * Original bytes and SHA-256 are never changed; no external AI provider is called.
 */
export async function POST(request: Request) {
  const session = getActiveSessionContext() || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = session?.user?.role || "";
  if (!userId || role !== "OWNER") {
    return NextResponse.json({ error: "Action réservée à l'OWNER." }, { status: 403 });
  }
  if (!(await hasPermission(userId, role, "CV_INTAKE"))) {
    return NextResponse.json({ error: "Permission d'import CV non accordée par l'Owner." }, { status: 403 });
  }

  let body: { ids?: unknown };
  try {
    body = await request.json() as { ids?: unknown };
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }
  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.filter((value): value is string => typeof value === "string" && value.length > 0))]
    : [];
  if (!ids.length || ids.length > 20 || ids.some((id) => id.length > 128)) {
    return NextResponse.json({ error: "Fournissez de 1 à 20 identifiants de CV valides." }, { status: 400 });
  }

  const records = await prisma.cvIntake.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, mimeType: true, fileData: true, originalSha256: true, status: true, analysis: true, matching: true },
  });
  if (records.length !== ids.length) {
    return NextResponse.json({ error: "Au moins un CV demandé est introuvable." }, { status: 404 });
  }

  const taxonomy = await prisma.jobCategory.findMany({
    where: { isActive: true },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    select: { id: true, code: true, name: true, parentId: true },
  });
  const taxonomyItems = taxonomy.map((item) => ({
    code: item.code,
    name: typeof item.name === "object" && item.name !== null && "fr" in item.name
      ? String((item.name as Record<string, unknown>).fr || item.code)
      : item.code,
    parentCode: taxonomy.find((parent) => parent.id === item.parentId)?.code || null,
  }));
  const jobs = await prisma.job.findMany({
    where: { status: "OPEN" },
    take: 500,
    select: { id: true, title: true, requiredSkills: true, requiredExperienceYears: true },
  });

  const results: Array<{ id: string; status: string; reason?: string }> = [];
  for (const record of records) {
    const previousAnalysis = record.analysis && typeof record.analysis === "object"
      ? record.analysis as Record<string, unknown>
      : {};
    const previousMatching = record.matching && typeof record.matching === "object"
      ? record.matching as Record<string, unknown>
      : {};
    const hasMatchingResult = typeof previousMatching.generatedAt === "string" && previousMatching.generatedAt.length > 0;
    if (record.status === "ANALYSE_OK" && !previousAnalysis.error && hasMatchingResult) {
      results.push({ id: record.id, status: "SKIPPED_ALREADY_ANALYZED" });
      continue;
    }

    try {
      const text = await extractTextFromCvBuffer(Buffer.from(record.fileData), record.mimeType, record.name);
      if (!text) {
        const reason = "Extraction locale impossible : document vide, scanné sans couche texte ou format non exploitable.";
        await prisma.cvIntake.update({
          where: { id: record.id },
          data: {
            status: "NON_ANALYSE",
            analysis: { sourceFactsOnly: true, error: reason, retryMethod: "LOCAL_DETERMINISTIC" },
            matching: { suggestedMatches: [], generatedAt: new Date().toISOString() },
            analyzedAt: null,
          },
        });
        await prisma.auditLog.create({
          data: {
            actorUserId: userId,
            actorRole: "OWNER",
            action: "CV_LOCAL_REANALYSIS",
            targetType: "CV_INTAKE",
            targetId: record.id,
            details: { success: false, originalSha256: record.originalSha256, method: "LOCAL_DETERMINISTIC", externalAiCalled: false },
          },
        });
        results.push({ id: record.id, status: "NON_ANALYSE", reason });
        continue;
      }

      const analysis = parseCvTextLocally(text, taxonomyItems);
      const suggestedMatches = jobs
        .map((job) => ({
          jobId: job.id,
          title: job.title,
          score: scoreJob(analysis, job),
          categoryId: taxonomy.find((item) => item.code === analysis.primaryCategoryCode)?.id || null,
          subCategoryId: taxonomy.find((item) => item.code === analysis.subCategoryCodes[0])?.id || null,
        }))
        .filter((match) => match.score >= 25)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
      await prisma.cvIntake.update({
        where: { id: record.id },
        data: {
          status: "ANALYSE_OK",
          analysis: { ...analysis, sourceFactsOnly: true, suggestedMatches, retryMethod: "LOCAL_DETERMINISTIC" },
          matching: { suggestedMatches, generatedAt: new Date().toISOString(), method: "LOCAL_DETERMINISTIC" },
          analyzedAt: new Date(),
        },
      });
      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          actorRole: "OWNER",
          action: "CV_LOCAL_REANALYSIS",
          targetType: "CV_INTAKE",
          targetId: record.id,
          details: {
            success: true,
            originalSha256: record.originalSha256,
            method: "LOCAL_DETERMINISTIC",
            externalAiCalled: false,
            suggestedMatchCount: suggestedMatches.length,
            originalImmutable: true,
          },
        },
      });
      results.push({ id: record.id, status: "ANALYSE_OK" });
    } catch {
      // Do not log the file, extracted text, personal data or provider payloads.
      results.push({ id: record.id, status: "NON_ANALYSE", reason: "Erreur de traitement local; l'original a été conservé." });
    }
  }

  return NextResponse.json({
    ok: results.every((result) => result.status === "ANALYSE_OK" || result.status === "SKIPPED_ALREADY_ANALYZED"),
    method: "LOCAL_DETERMINISTIC",
    externalAiCalled: false,
    originalFilesModified: false,
    results,
  });
}
