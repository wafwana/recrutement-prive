"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const profileSchema = z.object({
  headline: z.string().trim().max(160).optional(), bio: z.string().trim().max(2000).optional(), location: z.string().trim().max(120).optional(), phone: z.string().trim().max(40).optional(), cvUrl: z.string().trim().url().or(z.literal("")).optional(), preferences: z.string().trim().max(1000).optional(), skills: z.string().trim().max(1500).optional(), experienceYears: z.coerce.number().int().min(0).max(60).optional(),
});
function asOptional(value: FormDataEntryValue | null) { const text = String(value ?? "").trim(); return text || undefined; }
function csv(value: string | undefined) { return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : []; }

export async function saveCandidateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CANDIDAT") throw new Error("Accès refusé");
  const parsed = profileSchema.safeParse({
    headline: asOptional(formData.get("headline")), bio: asOptional(formData.get("bio")), location: asOptional(formData.get("location")), phone: asOptional(formData.get("phone")), cvUrl: String(formData.get("cvUrl") ?? "").trim(), preferences: asOptional(formData.get("preferences")), skills: asOptional(formData.get("skills")), experienceYears: asOptional(formData.get("experienceYears")),
  });
  if (!parsed.success) throw new Error("Données du profil invalides");
  await prisma.candidateProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, headline: parsed.data.headline, bio: parsed.data.bio, location: parsed.data.location, phone: parsed.data.phone, cvUrl: parsed.data.cvUrl || undefined, preferences: csv(parsed.data.preferences), skills: csv(parsed.data.skills), experienceYears: parsed.data.experienceYears },
    update: { headline: parsed.data.headline, bio: parsed.data.bio, location: parsed.data.location, phone: parsed.data.phone, cvUrl: parsed.data.cvUrl || null, preferences: csv(parsed.data.preferences), skills: csv(parsed.data.skills), experienceYears: parsed.data.experienceYears ?? null },
  });
  revalidatePath("/espace/candidat");
}
