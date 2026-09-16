import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isIdentityUnlocked } from "@/lib/mission-lock";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { candidateId } = await params;
  const userRole = session.user.role;
  const userId = session.user.id;

  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      userId: true,
      photoMimeType: true,
      photoData: true,
    },
  });

  if (!candidate || !candidate.photoData || !candidate.photoMimeType) {
    return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  }

  // Access control
  if (userRole === "CANDIDAT") {
    if (candidate.userId !== userId) {
      return NextResponse.json({ error: "Accès refusé à cette photo." }, { status: 403 });
    }
  } else if (userRole === "ENTREPRISE") {
    // Check if company has an unlocked mission presentation for this candidate
    const companyMemberships = await prisma.companyMember.findMany({
      where: { userId },
      select: { companyId: true },
    });
    const companyIds = companyMemberships.map((m) => m.companyId);

    const presentation = await prisma.missionPresentation.findFirst({
      where: {
        candidateId,
        companyId: { in: companyIds },
      },
      select: { state: true, financialConditionStatus: true },
    });

    const unlocked = presentation
      ? isIdentityUnlocked(presentation.state, presentation.financialConditionStatus)
      : false;

    if (!unlocked) {
      return NextResponse.json({ error: "Accès refusé : l'identité du candidat est encore masquée." }, { status: 403 });
    }
  } else if (userRole !== "OWNER" && userRole !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  return new Response(Buffer.from(candidate.photoData), {
    headers: {
      "Content-Type": candidate.photoMimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
