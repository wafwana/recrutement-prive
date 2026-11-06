import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { ingestAnalyzedCvIntakes } from "@/lib/sourcing/ingest";

type RouteParams = { params: Promise<{ id: string }> };
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = getActiveSessionContext() || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : null;
  const role = typeof session?.user?.role === "string" ? session.user.role : null;
  if (!userId || !role || !["OWNER", "ADMIN", "CONSULTANT"].includes(role)) return NextResponse.json({ error: "Accès réservé à l’OWNER, aux ADMIN et aux CONSULTANTS autorisés." }, { status: 403 });
  if (!(await hasPermission(userId, role, "CV_INTAKE"))) return NextResponse.json({ error: "La permission CV_INTAKE doit être accordée par l’OWNER." }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 }); }
  const input = asRecord(body);
  const status = input.status;
  const evidence = typeof input.evidence === "string" ? input.evidence.trim() : "";
  if (status !== "AUTHORIZED" && status !== "REVOKED") return NextResponse.json({ error: "Statut d’autorisation invalide." }, { status: 400 });
  if (evidence.length < 10 || evidence.length > 500) return NextResponse.json({ error: "Indique une preuve ou une référence d’autorisation/révocation (10 à 500 caractères)." }, { status: 400 });

  const intake = await prisma.cvIntake.findUnique({ where: { id }, select: { id: true, status: true, matching: true, candidateId: true, name: true, originalSha256: true } });
  if (!intake) return NextResponse.json({ error: "CV introuvable." }, { status: 404 });

  const verifiedAt = new Date();
  const previousConsentStatus = await prisma.$transaction(async (tx) => {
    const locked = await tx.cvIntake.updateMany({ where: { id }, data: { updatedAt: verifiedAt } });
    if (!locked.count) return null;
    const currentIntake = await tx.cvIntake.findUnique({
      where: { id },
      select: { id: true, status: true, matching: true, candidateId: true, name: true, originalSha256: true },
    });
    if (!currentIntake) return null;
    const previousMatching = asRecord(currentIntake.matching);
    const previousConsent = asRecord(previousMatching.consent);
    const nextMatching: Record<string, unknown> = {
      ...previousMatching,
      ...(status === "AUTHORIZED" && previousConsent.status === "REVOKED" ? { invitationStatus: null, invitationSentAt: null } : status === "REVOKED" && previousMatching.invitationStatus === "PREPARING" ? { invitationStatus: null } : {}),
      consent: { status, evidence, verifiedAt: verifiedAt.toISOString(), verifiedByUserId: userId },
    };
    if (status === "REVOKED" && typeof previousMatching.invitationTokenHash === "string") {
      await tx.passwordResetToken.deleteMany({ where: { tokenHash: previousMatching.invitationTokenHash, usedAt: null } });
      delete nextMatching.invitationTokenHash;
    }
    await tx.cvIntake.update({
      where: { id },
      data: { matching: nextMatching as Prisma.InputJsonValue },
    });
    const externalId = "cv-intake:" + id;
    const sourced = await tx.sourcedCandidate.findUnique({
      where: { source_externalId: { source: "PLATFORM_CV_INTAKE", externalId } },
      select: { id: true, status: true, matchingDetails: true },
    });
    if (sourced && status === "REVOKED") {
      const previous = asRecord(sourced.matchingDetails);
      await tx.sourcedCandidate.update({
        where: { id: sourced.id },
        data: {
          consentStatus: "REVOKED",
          status: "REJECTED",
          matchingScore: 0,
          matchingDetails: { ...previous, matchedOffers: [], consentRevokedAt: verifiedAt.toISOString(), consentRevocationEvidence: evidence },
          notes: "Autorisation d’exploitation révoquée par un utilisateur habilité. Exclu du matching et du vivier actif.",
        },
      });
    }
    if (currentIntake.candidateId) {
      const profile = await tx.candidateProfile.findUnique({ where: { id: currentIntake.candidateId }, select: { preferences: true, status: true } });
      const preferences = asRecord(profile?.preferences);
      const profileComesFromThisIntake = preferences.sourceCvIntakeId === id || preferences.source === "MANUAL_CV_IMPORT";
      if (profile && profileComesFromThisIntake && status === "REVOKED") {
        await tx.candidateProfile.update({
          where: { id: currentIntake.candidateId },
          data: { status: "SUSPENDED", preferences: { ...preferences, sourceCvIntakeId: id, consentStatus: "REVOKED", consentRevokedAt: verifiedAt.toISOString(), consentSuspendedAt: verifiedAt.toISOString() } },
        });
      }
      if (profile && profileComesFromThisIntake && status === "AUTHORIZED") {
        const nextPreferences: Record<string, unknown> = { ...preferences, sourceCvIntakeId: id, consentStatus: "AUTHORIZED", consentVerifiedAt: verifiedAt.toISOString() };
        delete nextPreferences.consentSuspendedAt;
        await tx.candidateProfile.update({
          where: { id: currentIntake.candidateId },
          data: { status: typeof preferences.consentSuspendedAt === "string" ? "ACTIVE" : profile.status, preferences: nextPreferences as Prisma.InputJsonValue },
        });
      }
      const candidateDocuments = await tx.candidateDocument.findMany({
        where: { candidateId: currentIntake.candidateId, docType: "CV", name: currentIntake.name },
        select: { id: true, fileData: true, analysis: true },
      });
      for (const document of candidateDocuments) {
        if (!document.fileData) continue;
        const fileHash = createHash("sha256").update(Buffer.from(document.fileData)).digest("hex");
        if (fileHash !== currentIntake.originalSha256) continue;
        if (status === "REVOKED") {
          await tx.candidateDocument.delete({ where: { id: document.id } });
        } else {
          const documentAnalysis = asRecord(document.analysis);
          await tx.candidateDocument.update({
            where: { id: document.id },
            data: { analysis: { ...documentAnalysis, sourceCvIntakeId: id, consentStatus: "AUTHORIZED", consentVerifiedAt: verifiedAt.toISOString() } },
          });
        }
      }
    }
    await tx.auditLog.create({
      data: {
        actorUserId: userId,
        actorRole: role,
        action: status === "AUTHORIZED" ? "CV_INTAKE_CONSENT_AUTHORIZED" : "CV_INTAKE_CONSENT_REVOKED",
        targetType: "CV_INTAKE",
        targetId: id,
        details: { consentStatus: status, evidence, previousConsentStatus: typeof previousConsent.status === "string" ? previousConsent.status : "PENDING", verifiedAt: verifiedAt.toISOString(), sourceStatus: currentIntake.status },
      },
    });
    return typeof previousConsent.status === "string" ? previousConsent.status : "PENDING";
  });
  if (previousConsentStatus === null) return NextResponse.json({ error: "CV introuvable." }, { status: 404 });

  let sync: unknown = null;
  if (status === "AUTHORIZED") {
    try { sync = await ingestAnalyzedCvIntakes(userId, 1, [id]); }
    catch (error) {
      console.warn("[cv-intake-consent] authorized CV sync deferred", error instanceof Error ? error.name : "UnknownError");
    }
  }
  return NextResponse.json({
    ok: true,
    consentStatus: status,
    syncedToCandidatePool: Boolean(sync && typeof sync === "object" && "synced" in sync && Number((sync as { synced: unknown }).synced) > 0),
    sync,
    message: status === "AUTHORIZED"
      ? "Autorisation enregistrée. Le CV pourra rejoindre le vivier interne après analyse structurée."
      : "Autorisation révoquée. Le CV est exclu du vivier actif et du matching.",
  });
}