import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { candidateProfileSchema } from "@/lib/validation";

const profileSelect = {
  id: true,
  userId: true,
  headline: true,
  bio: true,
  location: true,
  country: true,
  phonePrefix: true,
  phone: true,
  skills: true,
  experienceYears: true,
  preferences: true,
  createdAt: true,
  updatedAt: true,
  documents: {
    select: { id: true, name: true, type: true, createdAt: true },
  },
  applications: {
    include: { job: true },
    orderBy: { updatedAt: "desc" as const },
  },
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: session.user.id },
    select: profileSelect,
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
    },
    select: profileSelect,
  });

  return NextResponse.json(profile);
}
