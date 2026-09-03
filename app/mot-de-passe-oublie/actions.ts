"use server";

import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/password";
import { randomBytes } from "crypto";
import { Resend } from "resend";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // Generic anti-enumeration response
  const genericResponse = {
    ok: true,
    message: "Si cette adresse e-mail est associée à un compte, un lien de réinitialisation vous a été envoyé.",
  };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return genericResponse;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Do not reveal email absence
      return genericResponse;
    }

    // Generate cryptographically secure token
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

    // Save hashed token
    await prisma.passwordResetToken.create({
      data: {
        email,
        tokenHash,
        expiresAt,
      },
    });

    // Send reset email if Resend API key is configured
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reinitialisation-mot-de-passe?token=${rawToken}`;

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      const emailFrom = process.env.EMAIL_FROM || "contact@recrutement-prive.com";
      await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: "[Recrutement Privé] Réinitialisation de votre mot de passe",
        text: [
          "Bonjour,",
          "",
          "Vous avez demandé la réinitialisation de votre mot de passe.",
          "Veuillez cliquer sur le lien ci-dessous pour choisir un nouveau mot de passe (ce lien expire dans 15 minutes) :",
          "",
          resetUrl,
          "",
          "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.",
          "",
          "L'équipe Recrutement Privé",
        ].join("\n"),
      });
    }

    return genericResponse;
  } catch (error) {
    console.error("[requestPasswordReset] error occurred during password reset request");
    return genericResponse;
  }
}
