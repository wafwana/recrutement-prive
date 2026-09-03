import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isIdentityUnlocked } from "@/lib/mission-lock";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const document = await prisma.candidateDocument.findUnique({
    where: { id: documentId },
    include: {
      candidate: {
        select: { id: true, userId: true },
      },
    },
  });

  if (!document || !document.fileData) {
    return NextResponse.json({ error: "Document non trouvé" }, { status: 404 });
  }

  const userRole = session.user.role;
  const userId = session.user.id;

  // 1. Candidate ownership check
  if (userRole === "CANDIDAT") {
    if (document.candidate.userId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else if (userRole === "ENTREPRISE") {
    // 2. Company check: must have a mission presentation with unlocked identity
    const companyMember = await prisma.companyMember.findFirst({
      where: { userId },
      select: { companyId: true },
    });

    if (!companyMember) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const presentation = await prisma.missionPresentation.findFirst({
      where: {
        candidateId: document.candidateId,
        companyId: companyMember.companyId,
      },
      select: {
        state: true,
        financialConditionStatus: true,
      },
    });

    if (!presentation || !isIdentityUnlocked(presentation.state, presentation.financialConditionStatus)) {
      return NextResponse.json(
        { error: "L'accès aux documents personnels de ce candidat n'est pas autorisé avant déblocage de son identité." },
        { status: 403 }
      );
    }
  } else if (!userRole || !["ADMIN", "OWNER"].includes(userRole)) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }

  const headers = new Headers();
  headers.set("Content-Type", document.type || "application/pdf");
  const filename = document.name ? document.name : "document";
  headers.set(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(filename)}"`
  );

  return new NextResponse(new Uint8Array(document.fileData), {
    status: 200,
    headers,
  });
}
