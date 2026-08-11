import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: session.user.id },
    include: { documents: true, applications: true },
  });

  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.email || !session.user.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const profile = await prisma.candidateProfile.upsert({
    where: { userId: session.user.id },
    update: {
      headline: body.headline ?? undefined,
      bio: body.bio ?? undefined,
      location: body.location ?? undefined,
      phone: body.phone ?? undefined,
      cvUrl: body.cvUrl ?? undefined,
      preferences: body.preferences ?? undefined,
    },
    create: {
      userId: session.user.id,
      headline: body.headline ?? null,
      bio: body.bio ?? null,
      location: body.location ?? null,
      phone: body.phone ?? null,
      cvUrl: body.cvUrl ?? null,
      preferences: body.preferences ?? undefined,
    },
  });

  return NextResponse.json(profile);
}
