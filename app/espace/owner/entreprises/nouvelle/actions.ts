"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).optional(),
  website: z.string().trim().url().or(z.literal("")).optional(),
  country: z.string().trim().max(120).optional(),
  phonePrefix: z.string().trim().regex(/^\+\d{1,4}$/).optional(),
  phone: z.string().trim().max(40).optional(),
});

async function requireOwner() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") throw new Error("Accès réservé à l'OWNER.");
  return session.user.id;
}

export async function createOwnerCompany(formData: FormData) {
  const actorUserId = await requireOwner();
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    website: String(formData.get("website") ?? ""),
    country: String(formData.get("country") ?? ""),
    phonePrefix: String(formData.get("phonePrefix") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  if (!parsed.success) throw new Error("Les informations de l'entreprise sont invalides.");

  const name = parsed.data.name;
  const country = parsed.data.country || null;
  const existing = await prisma.company.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
    },
    select: { id: true, name: true, country: true },
  });
  if (existing) throw new Error(`Cette entreprise existe déjà dans Recrutement Privé : ${existing.name}${existing.country ? ` (${existing.country})` : ""}.`);

  const company = await prisma.company.create({
    data: {
      name,
      description: parsed.data.description || null,
      website: parsed.data.website || null,
      country,
      phonePrefix: parsed.data.phonePrefix || null,
      phone: parsed.data.phone || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId,
      actorRole: "OWNER",
      action: "COMPANY_CREATED_MANUALLY",
      targetType: "Company",
      targetId: company.id,
      details: { name: company.name, country: company.country, source: "OWNER_MANUAL_ENTRY" },
    },
  });

  return { ok: true, companyId: company.id, companyName: company.name };
}
