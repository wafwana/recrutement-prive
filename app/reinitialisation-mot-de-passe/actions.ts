"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, hashToken } from "@/lib/password-crypto";
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
    const now = new Date();

    const existingToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!existingToken) {
      return { ok: false, error: "Lien de réinitialisation invalide ou expiré." };
    }

    if (existingToken.usedAt !== null) {
      return { ok: false, error: "Ce lien de réinitialisation a déjà été utilisé." };
    }

    if (existingToken.expiresAt < now) {
      return { ok: false, error: "Ce lien de réinitialisation a expiré." };
    }

    const newHash = await hashPassword(newPassword);

    const result = await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          usedAt: now,
        },
      });

      if (consumed.count === 0) {
        return { ok: false, error: "Ce lien de réinitialisation a déjà été utilisé." };
      }

      await tx.user.update({
        where: { email: existingToken.email },
        data: { passwordHash: newHash },
      });

      return { ok: true };
    });

    return result;
  } catch (error) {
    console.error("[resetPassword] error occurred during password reset");
    return { ok: false, error: "Une erreur est survenue lors de la réinitialisation du mot de passe." };
  }
}
