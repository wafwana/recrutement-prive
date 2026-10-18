import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { hashToken } from "@/lib/password-crypto";
import { sendEmail } from "@/lib/email/service";
import { getAppBaseUrl } from "@/lib/url";

export async function POST(request: Request) {
  const session = getActiveSessionContext() || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = session?.user?.role || undefined;

  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (!(await hasPermission(userId, role, "CV_INTAKE"))) {
    return NextResponse.json({ error: "Permission d’import CV non accordée par l’Owner." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const intakeId = typeof body?.intakeId === "string" ? body.intakeId.trim() : "";
    if (!intakeId) return NextResponse.json({ error: "CV non identifié." }, { status: 400 });

    const intake = await prisma.cvIntake.findUnique({
      where: { id: intakeId },
      select: { id: true, candidateId: true, candidateEmail: true, candidateName: true },
    });
    if (!intake) return NextResponse.json({ error: "CV introuvable." }, { status: 404 });

    const email = intake.candidateEmail?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Aucune adresse e-mail valide n’est associée à ce CV." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, passwordHash: true, role: true, candidat: { select: { id: true } } },
    });
    if (!user || user.role !== "CANDIDAT" || !user.candidat) {
      return NextResponse.json({
        error: "Aucun compte candidat lié à ce CV. Vérifie l’adresse et le rattachement du profil avant d’envoyer une invitation.",
      }, { status: 409 });
    }
    if (user.passwordHash) {
      return NextResponse.json({ error: "Ce candidat dispose déjà d’un accès avec mot de passe. Aucune nouvelle invitation n’a été envoyée." }, { status: 409 });
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    await prisma.passwordResetToken.deleteMany({ where: { email } });
    await prisma.passwordResetToken.create({
      data: { email, tokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    const inviteUrl = `${getAppBaseUrl()}/reinitialisation-mot-de-passe?token=${rawToken}`;
    const safeName = (intake.candidateName || user.name || email.split("@")[0])
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const delivery = await sendEmail({
      to: email,
      subject: "[Recrutement Privé] Votre profil professionnel a été identifié",
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;color:#111827">
        <h2 style="color:#0b1b2b">Recrutement Privé</h2>
        <p>Bonjour ${safeName},</p>
        <p>Votre profil professionnel a été identifié et analysé à partir des informations présentes dans votre CV.</p>
        <p>Vous pouvez accepter la reprise de ce profil sur Recrutement Privé et créer votre accès en utilisant le lien sécurisé ci-dessous.</p>
        <p><a href="${inviteUrl}" style="display:inline-block;background:#0b1b2b;color:#fff;padding:12px 18px;text-decoration:none">Valider mon profil et créer mon accès</a></p>
        <p>Le lien est valable 7 jours. Si vous n'êtes pas concerné, vous pouvez ignorer ce message.</p>
        <p style="font-size:12px;color:#6b7280">Recrutement Privé — contact@recrutement-prive.com</p>
      </div>`,
    });

    if (!delivery.ok) {
      await prisma.passwordResetToken.delete({ where: { tokenHash } }).catch(() => undefined);
      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          actorRole: role || "UNKNOWN",
          action: "CANDIDATE_INVITATION_FAILED",
          targetType: "CV_INTAKE",
          targetId: intake.id,
          details: { email, reason: delivery.error || "Email delivery failed" },
        },
      });
      return NextResponse.json({ error: delivery.error || "Le service e-mail n’a pas confirmé l’envoi." }, { status: 502 });
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actorRole: role || "UNKNOWN",
        action: "CANDIDATE_INVITATION_SENT",
        targetType: "CV_INTAKE",
        targetId: intake.id,
        details: { email, expiresInDays: 7, candidateId: user.candidat.id },
      },
    });

    return NextResponse.json({ ok: true, sent: true, expiresInDays: 7 });
  } catch (error) {
    console.error("[owner candidate invitation]", error);
    return NextResponse.json({ error: "Erreur lors de la préparation de l’invitation." }, { status: 500 });
  }
}
