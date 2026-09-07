"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password-crypto";
import { validatePassword } from "@/lib/password-policy";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit comporter au moins 2 caractères.").max(100),
  email: z.string().trim().email("Adresse email invalide.").toLowerCase(),
  password: z.string(),
  country: z.string().trim().max(120).optional(),
  phonePrefix: z.string().trim().regex(/^\+\d{1,4}$/, "Préfixe téléphonique invalide.").optional(),
  phone: z.string().trim().max(40).optional(),
});

export async function registerCandidate(formData: FormData) {
  try {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const country = String(formData.get("country") ?? "France").trim();
    const phonePrefix = String(formData.get("phonePrefix") ?? "+33").trim();
    const phoneInput = String(formData.get("phone") ?? "").trim();

    const parseResult = registerSchema.safeParse({
      name,
      email,
      password,
      country,
      phonePrefix,
      phone: phoneInput,
    });

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0]?.message || "Données d'inscription invalides.";
      return { ok: false, error: issue };
    }

    const passVal = validatePassword(password);
    if (!passVal.isValid) {
      return {
        ok: false,
        error: `Le mot de passe ne respecte pas les critères : ${passVal.errors.join(" ")}`,
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { ok: false, error: "Un compte existe déjà avec cette adresse e-mail." };
    }

    const passwordHash = await hashPassword(password);
    const fullPhone = phoneInput ? (phoneInput.startsWith("+") ? phoneInput : `${phonePrefix} ${phoneInput}`) : null;

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "CANDIDAT",
        candidat: {
          create: {
            country: country || "France",
            phonePrefix: phonePrefix || "+33",
            phone: fullPhone,
          },
        },
      },
    });

    return { ok: true, email };
  } catch (error) {
    console.error("[registerCandidate] error:", error);
    return { ok: false, error: "Une erreur est survenue lors de la création du compte." };
  }
}
