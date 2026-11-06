import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateUploadedDocument } from "@/lib/security/file-validation";
import { buildCandidateFolder } from "@/lib/cv/folders";
import { hasPermission } from "@/lib/auth/permissions";

const CV_INTAKE_ALLOWED_TYPES = new Set([
  ...Array.from(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg"]),
  "text/plain",
  "text/markdown",
]);

export async function GET(request: Request) {
  const session = getActiveSessionContext() || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const userEmail = typeof session?.user?.email === "string" ? session.user.email : "";
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(session?.user?.role || "")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  if (!(await hasPermission(userId, session?.user?.role || undefined, "CV_INTAKE"))) return NextResponse.json({ error: "Permission d’import CV non accordée par l’Owner." }, { status: 403 });

  const canManageConsent = await hasPermission(userId, session?.user?.role || undefined, "CV_INTAKE");
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
      createdAt: true, updatedAt: true,
      candidate: { select: { id: true, preferences: true, user: { select: { name: true, email: true } } } },
    },
  });
  return NextResponse.json({
    documents: items.map((item) => {
      const matching = item.matching && typeof item.matching === "object" && !Array.isArray(item.matching) ? item.matching as Record<string, unknown> : {};
      const consent = matching.consent && typeof matching.consent === "object" && !Array.isArray(matching.consent) ? matching.consent as Record<string, unknown> : {};
      return { ...item, consentStatus: typeof consent.status === "string" ? consent.status : "PENDING", consentEvidence: typeof consent.evidence === "string" ? consent.evidence : null, consentVerifiedAt: typeof consent.verifiedAt === "string" ? consent.verifiedAt : null, invitationStatus: typeof matching.invitationStatus === "string" ? matching.invitationStatus : null, invitationSentAt: typeof matching.invitationSentAt === "string" ? matching.invitationSentAt : null };
    }),
    folders: [...new Set(items.map((item) => item.folderPath))].sort(),
    canManageConsent,
    canInviteCandidates: session?.user?.role === "OWNER",
    canReprocess: session?.user?.role === "OWNER",
  });
}

export async function POST(request: Request) {
  const session = getActiveSessionContext() || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const userEmail = typeof session?.user?.email === "string" ? session.user.email : "";
  const userRole = typeof session?.user?.role === "string" ? session.user.role : "";
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(userRole)) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  if (!(await hasPermission(userId, session?.user?.role || undefined, "CV_INTAKE"))) return NextResponse.json({ error: "Permission d’import CV non accordée par l’Owner." }, { status: 403 });

  try {
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

    // Do not parse, classify or match a CV before the OWNER verifies the authorization.
    const suggestedMatches: Array<{ jobId: string; title: string; score: number }> = [];
    const candidateEmail = typeof formData.get("candidateEmail") === "string"
      ? String(formData.get("candidateEmail")).replace(/\u0000/g, "").trim().toLowerCase() || null
      : null;
    const candidateName = typeof formData.get("candidateName") === "string"
      ? String(formData.get("candidateName")).replace(/\u0000/g, "").trim() || null
      : null;
    const candidateInviteSent = false;
    const candidateId = null;
    const suggestedFolder = buildCandidateFolder({ year: new Date().getFullYear(), documentKind: "CV" });


    const record = await prisma.cvIntake.create({
      data: {
        name: safeFileName,
        originalName: safeFileName,
        mimeType: file.type || "application/octet-stream",
        fileData: buffer,
        size: file.size,
        originalSha256: sha256,
        senderUserId: userId,
        senderRole: userRole,
        senderEmail: userEmail,
        candidateName,
        candidateEmail,
        candidateId,
        docType: "CV",
        folderPath: suggestedFolder,
        analyzedAt: null,
        status: "A_ANALYSER",
        matching: { suggestedMatches, generatedAt: new Date().toISOString(), consent: { status: "PENDING", evidence: null, verifiedAt: null, verifiedByUserId: null } },
      },
      select: { id: true, name: true, folderPath: true, analyzedAt: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actorRole: userRole,
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
          analysisGenerated: false,
          analysisDeferred: true,
          suggestedMatchCount: suggestedMatches.length,
          originalImmutable: true,
        },
      },
    });

    return NextResponse.json({ ok: true, document: record, originalImmutable: true, authorRole: userRole, candidateId, candidateInviteSent }, { status: 201 });
  } catch (error) {
    console.error("[owner cv intake]", error);
    return NextResponse.json({ error: "Erreur lors de l'intégration du CV." }, { status: 500 });
  }
}
