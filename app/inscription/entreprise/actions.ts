"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { validatePassword } from "@/lib/password-policy";
import { z } from "zod";

const registerCompanySchema = z.object({
  companyName: z.string().trim().min(2, "Le nom de l'entreprise doit comporter au moins 2 caractères.").max(120),
  userName: z.string().trim().min(2, "Le nom du contact doit comporter au moins 2 caractères.").max(100),
  email: z.string().trim().email("Adresse email invalide.").toLowerCase(),
  password: z.string(),
  website: z.string().trim().max(250).optional(),
  country: z.string().trim().max(120).optional(),
  phonePrefix: z.string().trim().regex(/^\+\d{1,4}$/, "Préfixe téléphonique invalide.").optional(),
  phone: z.string().trim().max(40).optional(),
});

export async function registerCompany(formData: FormData) {
  try {
    const companyName = String(formData.get("companyName") ?? "").trim();
    const userName = String(formData.get("userName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const website = String(formData.get("website") ?? "").trim();
    const country = String(formData.get("country") ?? "France").trim();
    const phonePrefix = String(formData.get("phonePrefix") ?? "+33").trim();
    const phoneInput = String(formData.get("phone") ?? "").trim();

    const parseResult = registerCompanySchema.safeParse({
      companyName,
      userName,
      email,
      password,
      website,
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

    const user = await prisma.user.create({
      data: {
        name: userName,
        email,
        passwordHash,
        role: "ENTREPRISE",
        companyLinks: {
          create: {
            role: "OWNER",
            company: {
              create: {
                name: companyName,
                website: website || null,
                country: country || "France",
                phonePrefix: phonePrefix || "+33",
                phone: fullPhone,
              },
            },
          },
        },
      },
    });

    return { ok: true, email };
  } catch (error) {
    console.error("[registerCompany] error:", error);
    return { ok: false, error: "Une erreur est survenue lors de la création du compte entreprise." };
  }
}
