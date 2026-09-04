"use server";

import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/password-crypto";
import { randomBytes } from "crypto";
import { Resend } from "resend";

export type RequestPasswordResetResult =
  | { ok: true; message: string; error?: undefined }
  | { ok: false; error: string; message?: undefined };

export async function requestPasswordReset(formData: FormData): Promise<RequestPasswordResetResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const genericResponse: RequestPasswordResetResult = {
    ok: true,
    message: "Si cette adresse e-mail est associée à un compte, un lien de réinitialisation vous a été envoyé.",
  };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return genericResponse;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const isTestEnv = process.env.NODE_ENV === "test" || process.env.CI === "true";

  if (!apiKey && !isTestEnv) {
    return {
      ok: false,
      error: "Le service d'envoi d'e-mail n'est pas disponible actuellement.",
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return genericResponse;
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        email,
        tokenHash,
        expiresAt,
      },
    });

    if (apiKey) {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reinitialisation-mot-de-passe?token=${rawToken}`;
      const resend = new Resend(apiKey);
      const emailFrom = process.env.EMAIL_FROM || "contact@recrutement-prive.com";

      const sendResult = await resend.emails.send({
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

      if (sendResult.error) {
        console.error("[requestPasswordReset] Resend email delivery failed:", sendResult.error.message);
        return {
          ok: false,
          error: "Impossible d'envoyer l'e-mail de réinitialisation pour le moment.",
        };
      }
    }

    return genericResponse;
  } catch (error) {
    console.error("[requestPasswordReset] unexpected error during password reset request");
    return genericResponse;
  }
}
