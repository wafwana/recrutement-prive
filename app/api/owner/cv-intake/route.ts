import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { analyzeCvDocument, analyzeCvDocumentLocally } from "@/lib/cv/analyzer";
import { validateUploadedDocument } from "@/lib/security/file-validation";
import { buildCandidateFolder, buildCandidateFolderFromAnalysis, resolveCvTaxonomySelection } from "@/lib/cv/folders";
import { ensureTaxonomySynced } from "@/lib/taxonomy/sync";
import { hasPermission } from "@/lib/auth/permissions";
import { sanitizePostgresJson } from "@/lib/security/sanitize-postgres-json";

const CV_INTAKE_ALLOWED_TYPES = new Set([
  ...Array.from(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg"]),
  "text/plain",
  "text/markdown",
]);

function scoreJob(analysis: Awaited<ReturnType<typeof analyzeCvDocument>>, job: { id: string; title: string; requiredSkills: unknown; requiredExperienceYears: number | null; jobCategoryId: string | null; subCategoryId: string | null }) {
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

export async function GET(request: Request) {
  const session = getActiveSessionContext() || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const userEmail = typeof session?.user?.email === "string" ? session.user.email : "";
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(session?.user?.role || "")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  if (!(await hasPermission(userId, session?.user?.role || undefined, "CV_INTAKE"))) return NextResponse.json({ error: "Permission d’import CV non accordée par l’Owner." }, { status: 403 });

  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();
  const items = await prisma.cvIntake.findMany({
    where: q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { originalName: { contains: q, mode: "insensitive" } },
        { candidateName: { contains: q, mode: "insensitive" } },
        { candidateEmail: { contains: q, mode: "insensitive" } },
        { folderPath: { contains: q, mode: "insensitive" } },
      ],
    } : undefined,
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: {
      id: true, name: true, originalName: true, mimeType: true, size: true,
      originalSha256: true, senderUserId: true, senderRole: true, senderEmail: true,
      candidateName: true, candidateEmail: true, docType: true, folderPath: true,
      analysis: true, matching: true, analyzedAt: true, status: true, candidateId: true,
      consentStatus: true, consentEvidence: true, consentVerifiedAt: true, consentVerifiedByUserId: true,
      createdAt: true, updatedAt: true,
      candidate: { select: { id: true, preferences: true, user: { select: { name: true, email: true } } } },
    },
  });
  return NextResponse.json({
    documents: items,
    folders: [...new Set(items.map((item) => item.folderPath))].sort(),
  });
}

export async function POST(request: Request) {
  const session = getActiveSessionContext() || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const userEmail = typeof session?.user?.email === "string" ? session.user.email : "";
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(session?.user?.role || "")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  if (!(await hasPermission(userId, session?.user?.role || undefined, "CV_INTAKE"))) return NextResponse.json({ error: "Permission d’import CV non accordée par l’Owner." }, { status: 403 });

  try {
    await ensureTaxonomySynced();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "Aucun CV fourni." }, { status: 400 });

    const fileCheck = await validateUploadedDocument(file, { allowedTypes: CV_INTAKE_ALLOWED_TYPES });
    if (!fileCheck.ok) return NextResponse.json({ error: fileCheck.error || "Fichier non conforme." }, { status: 400 });

    const safeFileName = file.name.replace(/\u0000/g, "");
    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const duplicate = await prisma.cvIntake.findFirst({ where: { originalSha256: sha256 }, select: { id: true, name: true, folderPath: true } });
    if (duplicate) return NextResponse.json({ error: "Ce CV original est déjà répertorié.", duplicateId: duplicate.id, name: duplicate.name, originalSha256: sha256, folderPath: duplicate.folderPath }, { status: 409 });

    const taxonomy = await prisma.jobCategory.findMany({
      where: { isActive: true },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
      select: { id: true, code: true, name: true, parentId: true },
    });
    const taxonomyItems = taxonomy.map((item) => ({
      code: item.code,
      name: typeof item.name === "object" && item.name !== null && "fr" in item.name ? String((item.name as Record<string, unknown>).fr || item.code) : typeof item.name === "string" ? item.name : item.code,
      parentCode: taxonomy.find((parent) => parent.id === item.parentId)?.code || null,
    }));

    let analysis: Awaited<ReturnType<typeof analyzeCvDocument>> = null;
    let analysisError: string | null = null;
    try {
      analysis = await analyzeCvDocument({
        fileName: safeFileName,
        mimeType: file.type || "application/octet-stream",
        buffer,
        taxonomy: taxonomyItems,
      });
    } catch (error) {
      // L'intégration du CV ne doit jamais échouer uniquement parce que
      // l'analyse IA est momentanément indisponible ou rejette le format.
      analysisError = error instanceof Error ? error.message : "Erreur d'analyse IA";
      console.error("[owner cv analysis]", error);
      // Provider failure must not leave a CV unprocessed when local text extraction works.
      try {
        analysis = await analyzeCvDocumentLocally({
          fileName: safeFileName,
          mimeType: file.type || "application/octet-stream",
          buffer,
          taxonomy: taxonomyItems,
        });
      } catch {
        analysis = null;
      }
    }

    // Extractors may return U+0000 from binary-heavy or malformed documents.
    // Preserve the original fileData bytes, but sanitize all parsed fields before DB/JSON persistence.
    analysis = sanitizePostgresJson(analysis);

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

    const taxonomySelection = resolveCvTaxonomySelection(analysis, taxonomyItems);

    const extractedEmail = analysis?.email || null;
    const candidateEmail = (typeof formData.get("candidateEmail") === "string"
      ? String(formData.get("candidateEmail")).replace(/\u0000/g, "").trim().toLowerCase() || null
      : null) || extractedEmail;
    const candidateName = (typeof formData.get("candidateName") === "string"
      ? String(formData.get("candidateName")).replace(/\u0000/g, "").trim() || null
      : null) || [analysis?.firstName, analysis?.lastName].filter(Boolean).join(" ").trim() || null;
    // Import is deliberately provisional: no account, candidate profile, invitation or company sharing is created here.
    // A direct candidate link must be performed separately after explicit Owner verification.
    const requestedCandidateId = typeof formData.get("candidateId") === "string" ? String(formData.get("candidateId")).trim() || null : null;
    if (requestedCandidateId) {
      const candidateExists = await prisma.candidateProfile.findUnique({ where: { id: requestedCandidateId }, select: { id: true } });
      if (!candidateExists) return NextResponse.json({ error: "Candidat introuvable." }, { status: 404 });
    }
    const candidateInviteSent = false;
    const candidateId = null;
    const year = new Date().getFullYear();
    const suggestedFolder = analysis
      ? buildCandidateFolderFromAnalysis(analysis, taxonomyItems, year, "CV")
      : buildCandidateFolder({ year, documentKind: "CV" });

    const record = await prisma.cvIntake.create({
      data: {
        name: safeFileName,
        originalName: safeFileName,
        mimeType: file.type || "application/octet-stream",
        fileData: buffer,
        size: file.size,
        originalSha256: sha256,
        senderUserId: userId,
        senderRole: "OWNER",
        senderEmail: userEmail,
        candidateName,
        candidateEmail,
        candidateId,
        docType: "CV",
        folderPath: suggestedFolder,
        analysis: analysis ? { ...analysis, sourceFactsOnly: true, suggestedMatches } : { sourceFactsOnly: true, suggestedMatches },
        matching: { suggestedMatches, generatedAt: new Date().toISOString() },
        analyzedAt: analysis ? new Date() : null,
        status: analysis ? "ANALYSE_OK" : "A_ANALYSER",
        consentStatus: "PENDING",
      },
      select: { id: true, name: true, folderPath: true, analyzedAt: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actorRole: "OWNER",
        action: "CV_REAL_IMPORT",
        targetType: "CV_INTAKE",
        targetId: record.id,
        details: {
          originalName: safeFileName,
          candidateInviteSent,
          candidateProfileLinked: false,
          consentStatus: "PENDING",
          invitationSent: false,
          originalSha256: sha256,
          folderPath: suggestedFolder,
          analysisGenerated: Boolean(analysis),
          analysisDeferred: Boolean(analysisError),
          suggestedMatchCount: suggestedMatches.length,
          originalImmutable: true,
        },
      },
    });

    return NextResponse.json({ ok: true, document: record, originalImmutable: true, authorRole: "OWNER", candidateId, candidateInviteSent }, { status: 201 });
  } catch (error) {
    console.error("[owner cv intake]", error);
    return NextResponse.json({ error: "Erreur lors de l'intégration du CV." }, { status: 500 });
  }
}
