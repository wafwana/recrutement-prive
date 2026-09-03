"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, hashToken } from "@/lib/password";
import { validatePassword } from "@/lib/password-policy";

export async function resetPassword(formData: FormData) {
  try {
    const token = String(formData.get("token") ?? "").trim();
    const newPassword = String(formData.get("password") ?? "");

    if (!token) {
      return { ok: false, error: "Jeton de réinitialisation manquant ou invalide." };
    }

    const passVal = validatePassword(newPassword);
    if (!passVal.isValid) {
      return {
        ok: false,
        error: `Le nouveau mot de passe ne respecte pas les critères : ${passVal.errors.join(" ")}`,
      };
    }

    const tokenHash = hashToken(token);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord) {
      return { ok: false, error: "Lien de réinitialisation invalide ou expiré." };
    }

    if (resetRecord.usedAt !== null) {
      return { ok: false, error: "Ce lien de réinitialisation a déjà été utilisé." };
    }

    if (resetRecord.expiresAt < new Date()) {
      return { ok: false, error: "Ce lien de réinitialisation a expiré." };
    }

    const user = await prisma.user.findUnique({
      where: { email: resetRecord.email },
    });

    if (!user) {
      return { ok: false, error: "Compte utilisateur introuvable." };
    }

    const newHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true };
  } catch (error) {
    console.error("[resetPassword] error occurred during password reset");
    return { ok: false, error: "Une erreur est survenue lors de la réinitialisation du mot de passe." };
  }
}
