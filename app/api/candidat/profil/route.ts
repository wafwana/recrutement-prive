import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { candidateProfileSchema } from "@/lib/validation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: session.user.id },
    include: { documents: true, applications: { include: { job: true }, orderBy: { updatedAt: "desc" } } },
  });

  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = candidateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données du profil invalides", issues: parsed.error.issues }, { status: 400 });
  }

  const preferences = Array.isArray(parsed.data.preferences)
    ? parsed.data.preferences
    : parsed.data.preferences
      ? parsed.data.preferences.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

  const skills = Array.isArray(parsed.data.skills)
    ? parsed.data.skills
    : parsed.data.skills
      ? parsed.data.skills.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

  const phone = parsed.data.phone ? (parsed.data.phone.startsWith("+") ? parsed.data.phone : `${parsed.data.phonePrefix ?? "+33"} ${parsed.data.phone}`) : null;

  const primaryCategoryId = parsed.data.primaryCategoryId || undefined;
  const rawSubCategoryIds = Array.isArray(parsed.data.subCategoryIds)
    ? parsed.data.subCategoryIds
    : parsed.data.subCategoryIds
      ? parsed.data.subCategoryIds.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  if (primaryCategoryId) {
    const parentCat = await prisma.jobCategory.findUnique({
      where: { id: primaryCategoryId },
      select: { id: true, isActive: true, parentId: true },
    });
    if (!parentCat || !parentCat.isActive || parentCat.parentId !== null) {
      return NextResponse.json({ error: "La catégorie métier sélectionnée est invalide ou inactive." }, { status: 400 });
    }
  } else if (rawSubCategoryIds.length > 0) {
    return NextResponse.json({ error: "Les sous-catégories nécessitent la sélection d'un métier principal." }, { status: 400 });
  }

  if (rawSubCategoryIds.length > 0) {
    const validSubCats = await prisma.jobCategory.findMany({
      where: {
        id: { in: rawSubCategoryIds },
        isActive: true,
        parentId: primaryCategoryId,
      },
      select: { id: true },
    });
    if (validSubCats.length !== rawSubCategoryIds.length) {
      return NextResponse.json({ error: "Une ou plusieurs sous-catégories sélectionnées sont invalides, inactives ou non rattachées au métier principal." }, { status: 400 });
    }
  }

  const profile = await prisma.candidateProfile.upsert({
    where: { userId: session.user.id },
    update: {
      headline: parsed.data.headline || null,
      bio: parsed.data.bio || null,
      location: parsed.data.location || null,
      country: parsed.data.country || null,
      phonePrefix: parsed.data.phonePrefix || null,
      phone,
      skills,
      experienceYears: parsed.data.experienceYears ?? null,
      preferences,
      primaryCategoryId: primaryCategoryId || null,
      subCategoryIds: rawSubCategoryIds.length ? rawSubCategoryIds : [],
    },
    create: {
      userId: session.user.id,
      headline: parsed.data.headline || null,
      bio: parsed.data.bio || null,
      location: parsed.data.location || null,
      country: parsed.data.country || null,
      phonePrefix: parsed.data.phonePrefix || null,
      phone,
      skills,
      experienceYears: parsed.data.experienceYears ?? null,
      preferences,
      primaryCategoryId: primaryCategoryId || undefined,
      subCategoryIds: rawSubCategoryIds.length ? rawSubCategoryIds : [],
    },
  });

  return NextResponse.json(profile);
}
