import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/password-crypto";
import { sendEmail } from "@/lib/email/service";
import { getAppBaseUrl } from "@/lib/url";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) : [];
}

export async function POST(request: Request) {
  const session = getActiveSessionContext() || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : null;
  const role = typeof session?.user?.role === "string" ? session.user.role : null;
  if (!userId || role !== "OWNER") return NextResponse.json({ error: "Seul l’OWNER peut préparer et envoyer l’invitation candidat." }, { status: 403 });

  try {
    const body = asRecord(await request.json());
    const intakeId = typeof body.intakeId === "string" ? body.intakeId.trim() : "";
    if (!intakeId) return NextResponse.json({ error: "CV non identifié." }, { status: 400 });

    const intake = await prisma.cvIntake.findUnique({
      where: { id: intakeId },
      select: { id: true, candidateId: true, candidateEmail: true, candidateName: true, matching: true, analysis: true, fileData: true, mimeType: true, name: true, folderPath: true, analyzedAt: true },
    });
    if (!intake) return NextResponse.json({ error: "CV introuvable." }, { status: 404 });
    const intakeMatching = asRecord(intake.matching);
    const consent = asRecord(intakeMatching.consent);
    if (consent.status !== "AUTHORIZED") return NextResponse.json({ error: "L’autorisation d’exploitation doit être validée par l’OWNER avant toute invitation." }, { status: 409 });
    if (intakeMatching.invitationStatus === "SENT") return NextResponse.json({ error: "Une invitation a déjà été envoyée pour ce CV." }, { status: 409 });
    if (intakeMatching.invitationStatus === "ACCOUNT_ALREADY_ACTIVE") return NextResponse.json({ ok: true, linked: true, invitationSent: false, candidateId: intake.candidateId, message: "Le compte candidat est déjà actif." });

    const email = intake.candidateEmail?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Aucune adresse e-mail valide n’est associée à ce CV." }, { status: 400 });

    const analysis = asRecord(intake.analysis);
    const explicitSkills = stringList(analysis.explicitSkills);
    const normalizedSkills = stringList(analysis.skills);
    const primaryCode = typeof analysis.primaryCategoryCode === "string" ? analysis.primaryCategoryCode : null;
    const subCodes = stringList(analysis.subCategoryCodes);
    const primaryCategory = primaryCode ? await prisma.jobCategory.findFirst({ where: { code: primaryCode, parentId: null, isActive: true }, select: { id: true } }) : null;
    const subCategories = subCodes.length ? await prisma.jobCategory.findMany({ where: { code: { in: subCodes }, isActive: true }, select: { id: true } }) : [];

    const linked = await prisma.$transaction(async (tx) => {
      const locked = await tx.cvIntake.updateMany({
        where: { id: intake.id, matching: { path: ["consent", "status"], equals: "AUTHORIZED" } },
        data: { updatedAt: new Date() },
      });
      if (!locked.count) throw new Error("CONSENT_NOT_AUTHORIZED");
      const currentIntake = await tx.cvIntake.findUnique({
        where: { id: intake.id },
        select: { id: true, candidateId: true, candidateEmail: true, candidateName: true, matching: true, analysis: true, fileData: true, mimeType: true, name: true, folderPath: true, analyzedAt: true },
      });
      if (!currentIntake) throw new Error("INTAKE_NOT_FOUND");
      const currentMatching = asRecord(currentIntake.matching);
      const currentConsent = asRecord(currentMatching.consent);
      if (currentConsent.status !== "AUTHORIZED") throw new Error("CONSENT_NOT_AUTHORIZED");
      if (currentMatching.invitationStatus === "SENT" || currentMatching.invitationStatus === "PREPARING") throw new Error("INVITATION_ALREADY_SENT");
      if (currentMatching.invitationStatus === "ACCOUNT_ALREADY_ACTIVE") {
        return { userId: "", candidateId: currentIntake.candidateId || "", candidateName: currentIntake.candidateName || "", passwordHash: "active", email: "", delivery: null };
      }

      const currentEmail = currentIntake.candidateEmail?.trim().toLowerCase();
      if (!currentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) throw new Error("INVALID_CANDIDATE_EMAIL");
      const currentAnalysis = asRecord(currentIntake.analysis);
      const user = await tx.user.findUnique({
        where: { email: currentEmail },
        select: { id: true, name: true, passwordHash: true, role: true, candidat: { select: { id: true } } },
      });
      if (user && user.role !== "CANDIDAT") throw new Error("EMAIL_BELONGS_TO_NON_CANDIDATE");
      if (currentIntake.candidateId && user?.candidat && currentIntake.candidateId !== user.candidat.id) throw new Error("CANDIDATE_LINK_CONFLICT");

      const candidateUser = user || await tx.user.create({
        data: { name: currentIntake.candidateName || currentEmail.split("@")[0], email: currentEmail, role: "CANDIDAT" },
        select: { id: true, name: true, passwordHash: true, role: true, candidat: { select: { id: true } } },
      });
      if (candidateUser.candidat) {
        const currentProfile = await tx.candidateProfile.findUnique({ where: { id: candidateUser.candidat.id }, select: { preferences: true, status: true } });
        const preferences = asRecord(currentProfile?.preferences);
        if (preferences.sourceCvIntakeId === currentIntake.id && currentProfile?.status === "SUSPENDED") {
          await tx.candidateProfile.update({
            where: { id: candidateUser.candidat.id },
            data: { status: "ACTIVE", preferences: { ...preferences, consentStatus: "AUTHORIZED", consentVerifiedAt: typeof currentConsent.verifiedAt === "string" ? currentConsent.verifiedAt : null } },
          });
        }
      }
      const candidate = candidateUser.candidat || await tx.candidateProfile.create({
        data: {
          userId: candidateUser.id,
          headline: typeof currentAnalysis.headline === "string" ? currentAnalysis.headline : null,
          bio: typeof currentAnalysis.improvedSummary === "string" ? currentAnalysis.improvedSummary : typeof currentAnalysis.summary === "string" ? currentAnalysis.summary : null,
          location: typeof currentAnalysis.location === "string" ? currentAnalysis.location : null,
          country: typeof currentAnalysis.country === "string" ? currentAnalysis.country : null,
          phone: typeof currentAnalysis.phone === "string" ? currentAnalysis.phone : null,
          skills: { explicit: explicitSkills, normalized: normalizedSkills },
          experienceYears: typeof currentAnalysis.experienceYears === "number" && Number.isFinite(currentAnalysis.experienceYears) ? Math.max(0, Math.min(60, Math.trunc(currentAnalysis.experienceYears))) : null,
          primaryCategoryId: primaryCategory?.id || null,
          subCategoryIds: subCategories.map((item) => item.id),
          preferences: { source: "CV_INTAKE_OWNER_APPROVED", sourceCvIntakeId: currentIntake.id, consentStatus: "AUTHORIZED", consentVerifiedAt: typeof currentConsent.verifiedAt === "string" ? currentConsent.verifiedAt : null, importedAt: new Date().toISOString() },
        },
        select: { id: true },
      });

      const existingDocument = await tx.candidateDocument.findFirst({ where: { candidateId: candidate.id, docType: "CV", analysis: { path: ["sourceCvIntakeId"], equals: currentIntake.id } }, select: { id: true } });
      if (!existingDocument) {
        await tx.candidateDocument.create({
          data: { candidateId: candidate.id, name: currentIntake.name, fileData: currentIntake.fileData, type: currentIntake.mimeType, docType: "CV", folderPath: currentIntake.folderPath, analysis: { ...currentAnalysis, sourceCvIntakeId: currentIntake.id, consentStatus: "AUTHORIZED" }, analyzedAt: currentIntake.analyzedAt, isPrimaryCv: true },
        });
      }
      await tx.cvIntake.update({
        where: { id: currentIntake.id },
        data: {
          candidateId: candidate.id,
          matching: { ...currentMatching, invitationStatus: candidateUser.passwordHash ? "ACCOUNT_ALREADY_ACTIVE" : "PREPARING", ...(candidateUser.passwordHash ? { invitationPreparedAt: new Date().toISOString() } : {}) },
        },
      });
      const provisional = await tx.sourcedCandidate.findUnique({
        where: { source_externalId: { source: "PLATFORM_CV_INTAKE", externalId: "cv-intake:" + currentIntake.id } },
        select: { id: true, matchingDetails: true },
      });
      if (provisional) {
        const previousDetails = asRecord(provisional.matchingDetails);
        await tx.sourcedCandidate.update({
          where: { id: provisional.id },
          data: {
            status: "REJECTED",
            matchingDetails: { ...previousDetails, promotedToCandidateId: candidate.id, promotedAt: new Date().toISOString(), promotionReason: "OWNER_INVITATION_FLOW" },
            notes: "Dossier provisoire converti en profil candidat de la plateforme après validation Owner et préparation de l’accès.",
          },
        });
      }
      await tx.auditLog.create({
        data: { actorUserId: userId, actorRole: "OWNER", action: "CV_INTAKE_LINKED_TO_CANDIDATE", targetType: "CV_INTAKE", targetId: currentIntake.id, details: { candidateId: candidate.id, invitationRequested: !candidateUser.passwordHash, consentStatus: "AUTHORIZED" } },
      });
      const candidateName = candidateUser.name || currentIntake.candidateName || currentEmail.split("@")[0];
      if (candidateUser.passwordHash) {
        return { userId: candidateUser.id, candidateId: candidate.id, candidateName, passwordHash: candidateUser.passwordHash, email: currentEmail, delivery: null };
      }

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      await tx.passwordResetToken.deleteMany({ where: { email: currentEmail } });
      await tx.passwordResetToken.create({ data: { email: currentEmail, tokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
      const inviteUrl = `${getAppBaseUrl()}/reinitialisation-mot-de-passe?token=${rawToken}`;
      const safeName = candidateName.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      await tx.cvIntake.update({
        where: { id: currentIntake.id },
        data: { matching: { ...currentMatching, invitationStatus: "SENT", invitationSentAt: new Date().toISOString(), invitationSentTo: currentEmail, invitationTokenHash: tokenHash } },
      });
      const sentAudit = await tx.auditLog.create({
        data: { actorUserId: userId, actorRole: "OWNER", action: "CANDIDATE_INVITATION_SENT", targetType: "CV_INTAKE", targetId: currentIntake.id, details: { email: currentEmail, expiresInDays: 7, candidateId: candidate.id, consentStatus: "AUTHORIZED" } },
        select: { id: true },
      });
      const emailDelivery = await sendEmail({
        to: currentEmail,
        subject: "[Recrutement Privé] Votre accès candidat est prêt à être activé",
        html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;color:#111827"><h2 style="color:#0b1b2b">Recrutement Privé</h2><p>Bonjour ${safeName},</p><p>Votre dossier candidat a été préparé après vérification de l’autorisation d’utilisation de votre CV.</p><p>Vous pouvez vérifier les informations et activer votre accès avec le lien sécurisé ci-dessous.</p><p><a href="${inviteUrl}" style="display:inline-block;background:#0b1b2b;color:#fff;padding:12px 18px;text-decoration:none">Vérifier mon profil et activer mon accès</a></p><p>Le lien est valable 7 jours. Si vous n’êtes pas concerné, vous pouvez ignorer ce message.</p></div>`,
      });
      if (!emailDelivery.ok) {
        await tx.passwordResetToken.delete({ where: { tokenHash } }).catch(() => undefined);
        const failedMatching: Record<string, unknown> = { ...currentMatching, invitationStatus: null };
        delete failedMatching.invitationSentAt;
        delete failedMatching.invitationSentTo;
        delete failedMatching.invitationTokenHash;
        await tx.cvIntake.update({ where: { id: currentIntake.id }, data: { matching: failedMatching as Prisma.InputJsonValue } });
        await tx.auditLog.delete({ where: { id: sentAudit.id } });
        await tx.auditLog.create({ data: { actorUserId: userId, actorRole: "OWNER", action: "CANDIDATE_INVITATION_FAILED", targetType: "CV_INTAKE", targetId: currentIntake.id, details: { candidateId: candidate.id, reason: emailDelivery.error || "Email delivery failed" } } });
        return { userId: candidateUser.id, candidateId: candidate.id, candidateName, passwordHash: null, email: currentEmail, delivery: { ok: false as const, error: emailDelivery.error || "Le service e-mail n’a pas confirmé l’envoi. Le dossier candidat reste préparé ; tu peux relancer l’invitation." } };
      }
      return { userId: candidateUser.id, candidateId: candidate.id, candidateName, passwordHash: null, email: currentEmail, delivery: { ok: true as const, expiresInDays: 7 } };
    }, { maxWait: 10_000, timeout: 30_000 });

    if (linked.passwordHash) {
      return NextResponse.json({ ok: true, linked: true, invitationSent: false, candidateId: linked.candidateId, message: "CV rattaché au compte candidat existant. Aucun nouvel accès n’a été envoyé." });
    }
    if (!linked.delivery?.ok) {
      return NextResponse.json({ error: linked.delivery?.error || "Le service e-mail n’a pas confirmé l’envoi. Le dossier candidat reste préparé ; tu peux relancer l’invitation." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, linked: true, invitationSent: true, expiresInDays: linked.delivery.expiresInDays, candidateId: linked.candidateId });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_BELONGS_TO_NON_CANDIDATE") return NextResponse.json({ error: "Cette adresse appartient déjà à un compte non-candidat. Aucun rattachement n’a été effectué." }, { status: 409 });
    if (error instanceof Error && error.message === "CANDIDATE_LINK_CONFLICT") return NextResponse.json({ error: "Le CV est déjà lié à un autre profil candidat. Vérification manuelle requise." }, { status: 409 });
    if (error instanceof Error && error.message === "CONSENT_NOT_AUTHORIZED") return NextResponse.json({ error: "L’autorisation a été révoquée ou n’est plus valide. Aucune invitation n’a été envoyée." }, { status: 409 });
    if (error instanceof Error && error.message === "INVITATION_ALREADY_SENT") return NextResponse.json({ error: "Une invitation est déjà envoyée ou en cours de préparation pour ce CV." }, { status: 409 });
    if (error instanceof Error && error.message === "INVALID_CANDIDATE_EMAIL") return NextResponse.json({ error: "Aucune adresse e-mail valide n’est associée à ce CV." }, { status: 400 });
    console.error("[owner candidate invitation]", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Erreur lors de la préparation de l’invitation." }, { status: 500 });
  }
}