import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: session.user.id },
    include: { documents: true, applications: true },
  });

  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const profile = await prisma.candidateProfile.upsert({
    where: { userId: session.user.id },
    update: {
      headline: typeof body.headline === "string" ? body.headline.trim() : undefined,
      bio: typeof body.bio === "string" ? body.bio.trim() : undefined,
      location: typeof body.location === "string" ? body.location.trim() : undefined,
      phone: typeof body.phone === "string" ? body.phone.trim() : undefined,
      cvUrl: typeof body.cvUrl === "string" ? body.cvUrl.trim() : undefined,
      preferences: body.preferences ?? undefined,
    },
    create: {
      userId: session.user.id,
      headline: typeof body.headline === "string" ? body.headline.trim() : null,
      bio: typeof body.bio === "string" ? body.bio.trim() : null,
      location: typeof body.location === "string" ? body.location.trim() : null,
      phone: typeof body.phone === "string" ? body.phone.trim() : null,
      cvUrl: typeof body.cvUrl === "string" ? body.cvUrl.trim() : null,
      preferences: body.preferences ?? undefined,
    },
  });

  return NextResponse.json(profile);
}
