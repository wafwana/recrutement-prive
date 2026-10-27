"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères.").max(180),
  siren: z.string().trim().regex(/^\d{9}$/, "Le SIREN doit comporter 9 chiffres.").or(z.literal("")).optional(),
  siret: z.string().trim().regex(/^\d{14}$/, "Le SIRET doit comporter 14 chiffres.").or(z.literal("")).optional(),
  legalForm: z.string().trim().max(120).optional(),
  apeCode: z.string().trim().max(20).optional(),
  address: z.string().trim().max(300).optional(),
  sourceType: z.string().trim().max(100).optional(),
  sourceUrl: z.string().trim().url().or(z.literal("")).optional(),
  sourceCollectedAt: z.string().optional(),
  contactEmail: z.string().trim().email("Adresse e-mail invalide.").or(z.literal("")).optional(),
  description: z.string().trim().max(2000).optional(),
  website: z.string().trim().url("URL de site web invalide.").or(z.literal("")).optional(),
  country: z.string().trim().max(120).optional(),
  phonePrefix: z.string().trim().regex(/^\+\d{1,4}$/).or(z.literal("")).optional(),
  phone: z.string().trim().max(40).optional(),
});

export type CreateOwnerCompanyResult =
  | { ok: true; companyId: string; companyName: string }
  | { ok: false; error: string };

async function requireOwner() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") {
    return null;
  }
  return session.user.id;
}

export async function createOwnerCompany(formData: FormData): Promise<CreateOwnerCompanyResult> {
  try {
    const actorUserId = await requireOwner();
    if (!actorUserId) {
      return { ok: false, error: "Accès réservé à l'OWNER." };
    }

    const rawSiren = String(formData.get("siren") ?? "").trim();
    const rawSiret = String(formData.get("siret") ?? "").trim();

    const parsed = schema.safeParse({
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      siren: rawSiren,
      siret: rawSiret,
      legalForm: String(formData.get("legalForm") ?? ""),
      apeCode: String(formData.get("apeCode") ?? ""),
      address: String(formData.get("address") ?? ""),
      sourceType: String(formData.get("sourceType") ?? ""),
      sourceUrl: String(formData.get("sourceUrl") ?? ""),
      sourceCollectedAt: String(formData.get("sourceCollectedAt") ?? "") || undefined,
      contactEmail: String(formData.get("contactEmail") ?? ""),
      website: String(formData.get("website") ?? ""),
      country: String(formData.get("country") ?? ""),
      phonePrefix: String(formData.get("phonePrefix") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Les informations de l'entreprise sont invalides.";
      return { ok: false, error: firstIssue };
    }

    const {
      name,
      siren,
      siret,
      legalForm,
      apeCode,
      address,
      sourceType,
      sourceUrl,
      sourceCollectedAt,
      contactEmail,
      description,
      website,
      country,
      phonePrefix,
      phone,
    } = parsed.data;

    if (siret) {
      const existingSiret = await prisma.company.findFirst({
        where: { siret },
        select: { id: true, name: true },
      });
      if (existingSiret) {
        return {
          ok: false,
          error: `Une entreprise avec le SIRET ${siret} existe déjà : ${existingSiret.name}.`,
        };
      }
    }

    if (siren) {
      const existingSiren = await prisma.company.findFirst({
        where: { siren },
        select: { id: true, name: true },
      });
      if (existingSiren) {
        return {
          ok: false,
          error: `Une entreprise avec le SIREN ${siren} existe déjà : ${existingSiren.name}.`,
        };
      }
    }

    const countryVal = country || null;
    const existingName = await prisma.company.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...(countryVal ? { country: { equals: countryVal, mode: "insensitive" } } : {}),
      },
      select: { id: true, name: true, country: true },
    });
    if (existingName) {
      return {
        ok: false,
        error: `Cette entreprise existe déjà dans Recrutement Privé : ${existingName.name}${existingName.country ? ` (${existingName.country})` : ""}.`,
      };
    }

    const collectedAtDate = sourceCollectedAt ? new Date(sourceCollectedAt) : null;

    const company = await prisma.company.create({
      data: {
        name,
        siren: siren || (siret ? siret.slice(0, 9) : null),
        siret: siret || null,
        legalForm: legalForm || null,
        apeCode: apeCode || null,
        address: address || null,
        sourceType: sourceType || null,
        sourceUrl: sourceUrl || null,
        sourceCollectedAt: collectedAtDate && !isNaN(collectedAtDate.getTime()) ? collectedAtDate : null,
        contactEmail: contactEmail || null,
        contactEmailSourceUrl: contactEmail ? sourceUrl || null : null,
        contactEmailCollectedAt: contactEmail ? new Date() : null,
        description: description || null,
        website: website || null,
        country: countryVal,
        phonePrefix: phonePrefix || null,
        phone: phone || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId,
        actorRole: "OWNER",
        action: "COMPANY_CREATED_MANUALLY",
        targetType: "Company",
        targetId: company.id,
        details: {
          name: company.name,
          siret: company.siret,
          contactEmail: company.contactEmail,
          country: company.country,
          source: "OWNER_MANUAL_ENTRY",
        },
      },
    });

    return { ok: true, companyId: company.id, companyName: company.name };
  } catch (error) {
    console.error("[createOwnerCompany]", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement de l'entreprise.",
    };
  }
}
