import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ingestAnalyzedCvIntakes } from "@/lib/sourcing/ingest";

type RouteParams = { params: Promise<{ id: string }> };
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = getActiveSessionContext() || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : null;
  const role = typeof session?.user?.role === "string" ? session.user.role : null;
  if (!userId || role !== "OWNER") return NextResponse.json({ error: "Seul l’OWNER peut valider ou révoquer l’autorisation d’exploitation d’un CV." }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 }); }
  const input = asRecord(body);
  const status = input.status;
  const evidence = typeof input.evidence === "string" ? input.evidence.trim() : "";
  if (status !== "AUTHORIZED" && status !== "REVOKED") return NextResponse.json({ error: "Statut d’autorisation invalide." }, { status: 400 });
  if (evidence.length < 10 || evidence.length > 500) return NextResponse.json({ error: "Indique une preuve ou une référence d’autorisation/révocation (10 à 500 caractères)." }, { status: 400 });

  const intake = await prisma.cvIntake.findUnique({ where: { id }, select: { id: true, status: true, matching: true, candidateId: true } });
  if (!intake) return NextResponse.json({ error: "CV introuvable." }, { status: 404 });

  const verifiedAt = new Date();
  const previousMatching = asRecord(intake.matching);
  const previousConsent = asRecord(previousMatching.consent);
  await prisma.$transaction(async (tx) => {
    await tx.cvIntake.update({
      where: { id },
      data: {
        matching: { ...previousMatching, ...(status === "AUTHORIZED" && previousConsent.status === "REVOKED" ? { invitationStatus: null, invitationSentAt: null } : {}), consent: { status, evidence, verifiedAt: verifiedAt.toISOString(), verifiedByUserId: userId } },
      },
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
          matchingDetails: { ...previous, consentRevokedAt: verifiedAt.toISOString(), consentRevocationEvidence: evidence },
          notes: "Autorisation d’exploitation révoquée par l’OWNER. Exclu du matching et du vivier actif.",
        },
      });
    }
    if (status === "REVOKED" && intake.candidateId) {
      const profile = await tx.candidateProfile.findUnique({ where: { id: intake.candidateId }, select: { preferences: true, status: true } });
      const preferences = asRecord(profile?.preferences);
      if (profile && preferences.sourceCvIntakeId === id) {
        await tx.candidateProfile.update({
          where: { id: intake.candidateId },
          data: { status: "SUSPENDED", preferences: { ...preferences, consentStatus: "REVOKED", consentRevokedAt: verifiedAt.toISOString() } },
        });
      }
      await tx.candidateDocument.deleteMany({
        where: { candidateId: intake.candidateId, docType: "CV", analysis: { path: ["sourceCvIntakeId"], equals: id } },
      });
    }
    await tx.auditLog.create({
      data: {
        actorUserId: userId,
        actorRole: "OWNER",
        action: status === "AUTHORIZED" ? "CV_INTAKE_CONSENT_AUTHORIZED" : "CV_INTAKE_CONSENT_REVOKED",
        targetType: "CV_INTAKE",
        targetId: id,
        details: { consentStatus: status, evidence, previousConsentStatus: typeof previousConsent.status === "string" ? previousConsent.status : "PENDING", verifiedAt: verifiedAt.toISOString(), sourceStatus: intake.status },
      },
    });
  });

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