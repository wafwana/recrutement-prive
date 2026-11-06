import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromCvBuffer, parseCvTextLocally } from "@/lib/cv/analyzer";
import { hasPermission } from "@/lib/auth/permissions";
import { ingestAnalyzedCvIntakes } from "@/lib/sourcing/ingest";

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
  const results: Array<{ id: string; status: string; reason?: string }> = [];
  for (const record of records) {
    const previousAnalysis = record.analysis && typeof record.analysis === "object"
      ? record.analysis as Record<string, unknown>
      : {};
    const previousMatching = record.matching && typeof record.matching === "object"
      ? record.matching as Record<string, unknown>
      : {};
    const consent = previousMatching.consent && typeof previousMatching.consent === "object" && !Array.isArray(previousMatching.consent)
      ? previousMatching.consent as Record<string, unknown>
      : {};
    if (consent.status !== "AUTHORIZED") {
      results.push({
        id: record.id,
        status: "SKIPPED_CONSENT_PENDING",
        reason: "Analyse bloquée : autorisation d’exploitation non validée par l’OWNER.",
      });
      continue;
    }
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
            matching: { ...previousMatching, suggestedMatches: [], generatedAt: new Date().toISOString(), method: "LOCAL_DETERMINISTIC" },
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
      const suggestedMatches: Array<{ jobId: string; title: string; score: number }> = [];
      await prisma.cvIntake.update({
        where: { id: record.id },
        data: {
          status: "ANALYSE_OK",
          analysis: { ...analysis, sourceFactsOnly: true, retryMethod: "LOCAL_DETERMINISTIC" },
          matching: { ...previousMatching, suggestedMatches, generatedAt: new Date().toISOString(), method: "LOCAL_DETERMINISTIC" },
          analyzedAt: new Date(),
        },
      });
      await ingestAnalyzedCvIntakes(userId, 1, [record.id]);
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
            suggestedMatchCount: 0,
            consentStatus: typeof consent.status === "string" ? consent.status : "PENDING",
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
