import { NextResponse } from "next/server";
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
      select: { id: true, candidateId: true, candidateEmail: true, candidateName: true, consentStatus: true, consentVerifiedAt: true, analysis: true, fileData: true, mimeType: true, name: true, folderPath: true, analyzedAt: true },
    });
    if (!intake) return NextResponse.json({ error: "CV introuvable." }, { status: 404 });
    if (intake.consentStatus !== "AUTHORIZED") return NextResponse.json({ error: "L’autorisation d’exploitation doit être validée par l’OWNER avant toute invitation." }, { status: 409 });

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
      const user = await tx.user.findUnique({
        where: { email },
        select: { id: true, name: true, passwordHash: true, role: true, candidat: { select: { id: true } } },
      });
      if (user && user.role !== "CANDIDAT") throw new Error("EMAIL_BELONGS_TO_NON_CANDIDATE");
      if (intake.candidateId && user?.candidat && intake.candidateId !== user.candidat.id) throw new Error("CANDIDATE_LINK_CONFLICT");

      const candidateUser = user || await tx.user.create({
        data: { name: intake.candidateName || email.split("@")[0], email, role: "CANDIDAT" },
        select: { id: true, name: true, passwordHash: true, role: true, candidat: { select: { id: true } } },
      });
      const candidate = candidateUser.candidat || await tx.candidateProfile.create({
        data: {
          userId: candidateUser.id,
          headline: typeof analysis.headline === "string" ? analysis.headline : null,
          bio: typeof analysis.improvedSummary === "string" ? analysis.improvedSummary : typeof analysis.summary === "string" ? analysis.summary : null,
          location: typeof analysis.location === "string" ? analysis.location : null,
          country: typeof analysis.country === "string" ? analysis.country : null,
          phone: typeof analysis.phone === "string" ? analysis.phone : null,
          skills: { explicit: explicitSkills, normalized: normalizedSkills },
          experienceYears: typeof analysis.experienceYears === "number" && Number.isFinite(analysis.experienceYears) ? Math.max(0, Math.min(60, Math.trunc(analysis.experienceYears))) : null,
          primaryCategoryId: primaryCategory?.id || null,
          subCategoryIds: subCategories.map((item) => item.id),
          preferences: { source: "CV_INTAKE_OWNER_APPROVED", consentStatus: "AUTHORIZED", consentVerifiedAt: intake.consentVerifiedAt?.toISOString() || null, importedAt: new Date().toISOString() },
        },
        select: { id: true },
      });

      const existingDocument = await tx.candidateDocument.findFirst({ where: { candidateId: candidate.id, name: intake.name, docType: "CV" }, select: { id: true } });
      if (!existingDocument) {
        await tx.candidateDocument.create({
          data: { candidateId: candidate.id, name: intake.name, fileData: intake.fileData, type: intake.mimeType, docType: "CV", folderPath: intake.folderPath, analysis: intake.analysis ?? undefined, analyzedAt: intake.analyzedAt, isPrimaryCv: true },
        });
      }
      await tx.cvIntake.update({ where: { id: intake.id }, data: { candidateId: candidate.id } });
      await tx.auditLog.create({
        data: { actorUserId: userId, actorRole: "OWNER", action: "CV_INTAKE_LINKED_TO_CANDIDATE", targetType: "CV_INTAKE", targetId: intake.id, details: { candidateId: candidate.id, invitationRequested: !candidateUser.passwordHash, consentStatus: "AUTHORIZED" } },
      });
      return { userId: candidateUser.id, candidateId: candidate.id, candidateName: candidateUser.name || intake.candidateName || email.split("@")[0], passwordHash: candidateUser.passwordHash };
    });

    if (linked.passwordHash) return NextResponse.json({ ok: true, linked: true, invitationSent: false, candidateId: linked.candidateId, message: "CV rattaché au compte candidat existant. Aucun nouvel accès n’a été envoyé." });

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    await prisma.passwordResetToken.deleteMany({ where: { email } });
    await prisma.passwordResetToken.create({ data: { email, tokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    const inviteUrl = `${getAppBaseUrl()}/reinitialisation-mot-de-passe?token=${rawToken}`;
    const safeName = linked.candidateName.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const delivery = await sendEmail({
      to: email,
      subject: "[Recrutement Privé] Votre accès candidat est prêt à être activé",
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;color:#111827"><h2 style="color:#0b1b2b">Recrutement Privé</h2><p>Bonjour ${safeName},</p><p>Votre dossier candidat a été préparé après vérification de l’autorisation d’utilisation de votre CV.</p><p>Vous pouvez vérifier les informations et activer votre accès avec le lien sécurisé ci-dessous.</p><p><a href="${inviteUrl}" style="display:inline-block;background:#0b1b2b;color:#fff;padding:12px 18px;text-decoration:none">Vérifier mon profil et activer mon accès</a></p><p>Le lien est valable 7 jours. Si vous n’êtes pas concerné, vous pouvez ignorer ce message.</p></div>`,
    });
    if (!delivery.ok) {
      await prisma.passwordResetToken.delete({ where: { tokenHash } }).catch(() => undefined);
      await prisma.auditLog.create({ data: { actorUserId: userId, actorRole: "OWNER", action: "CANDIDATE_INVITATION_FAILED", targetType: "CV_INTAKE", targetId: intake.id, details: { candidateId: linked.candidateId, reason: delivery.error || "Email delivery failed" } } });
      return NextResponse.json({ error: delivery.error || "Le service e-mail n’a pas confirmé l’envoi. Le dossier candidat reste préparé ; tu peux relancer l’invitation." }, { status: 502 });
    }
    await prisma.auditLog.create({ data: { actorUserId: userId, actorRole: "OWNER", action: "CANDIDATE_INVITATION_SENT", targetType: "CV_INTAKE", targetId: intake.id, details: { email, expiresInDays: 7, candidateId: linked.candidateId, consentStatus: "AUTHORIZED" } } });
    return NextResponse.json({ ok: true, linked: true, invitationSent: true, expiresInDays: 7, candidateId: linked.candidateId });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_BELONGS_TO_NON_CANDIDATE") return NextResponse.json({ error: "Cette adresse appartient déjà à un compte non-candidat. Aucun rattachement n’a été effectué." }, { status: 409 });
    if (error instanceof Error && error.message === "CANDIDATE_LINK_CONFLICT") return NextResponse.json({ error: "Le CV est déjà lié à un autre profil candidat. Vérification manuelle requise." }, { status: 409 });
    console.error("[owner candidate invitation]", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Erreur lors de la préparation de l’invitation." }, { status: 500 });
  }
}