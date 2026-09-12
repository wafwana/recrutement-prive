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
    include: {
      documents: { select: { id: true, candidateId: true, name: true, type: true, createdAt: true } },
      applications: {
        select: {
          id: true,
          candidateId: true,
          jobId: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          job: {
            select: {
              id: true,
              title: true,
              location: true,
              missionType: true,
              status: true,
              jobCategoryId: true,
              subCategoryId: true,
              company: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
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

  const subCategoryIds = Array.isArray(parsed.data.subCategoryIds)
    ? parsed.data.subCategoryIds
    : parsed.data.subCategoryIds
      ? [parsed.data.subCategoryIds]
      : [];

  if (parsed.data.primaryCategoryId) {
    const parentCat = await prisma.jobCategory.findUnique({
      where: { id: parsed.data.primaryCategoryId },
      select: { id: true, isActive: true, parentId: true },
    });
    if (!parentCat || !parentCat.isActive || parentCat.parentId !== null) {
      return NextResponse.json({ error: "La catégorie métier sélectionnée est invalide ou inactive." }, { status: 400 });
    }
  }

  if (subCategoryIds.length > 0) {
    if (!parsed.data.primaryCategoryId) {
      return NextResponse.json({ error: "Sélectionner des sous-catégories requiert une catégorie principale." }, { status: 400 });
    }
    const validSubCats = await prisma.jobCategory.findMany({
      where: {
        id: { in: subCategoryIds },
        isActive: true,
        parentId: parsed.data.primaryCategoryId,
      },
      select: { id: true },
    });
    if (validSubCats.length !== subCategoryIds.length) {
      return NextResponse.json({ error: "Une ou plusieurs sous-catégories sélectionnées sont invalides." }, { status: 400 });
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
      primaryCategoryId: parsed.data.primaryCategoryId || null,
      subCategoryIds: subCategoryIds.length ? subCategoryIds : [],
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
      primaryCategoryId: parsed.data.primaryCategoryId || undefined,
      subCategoryIds: subCategoryIds.length ? subCategoryIds : [],
    },
  });

  return NextResponse.json(profile);
}
