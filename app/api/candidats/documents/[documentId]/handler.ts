import { prisma } from "@/lib/prisma";
import { isIdentityUnlocked } from "@/lib/mission-lock";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";

export async function handleGetCandidateDocument(
  documentId: string,
  session: { user?: { id?: string | null; role?: string | null } } | null
) {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const document = await prisma.candidateDocument.findUnique({
    where: { id: documentId },
    select: { id: true, name: true, type: true, docType: true, fileData: true, candidateId: true, candidate: { select: { id: true, userId: true } } },
  });

  if (!document || !document.fileData) {
    return NextResponse.json({ error: "Document non trouvé" }, { status: 404 });
  }

  const userRole = session.user.role;
  const userId = session.user.id;

  if (userRole === "CANDIDAT") {
    if (document.candidate.userId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else if (userRole === "ENTREPRISE") {
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
  } else if (userRole === "CONSULTANT") {
    if (document.docType !== "CV") {
      return NextResponse.json({ error: "Document non accessible dans cet espace." }, { status: 403 });
    }
    if (!(await hasPermission(userId, userRole, "DOCUMENTS_VIEW"))) {
      return NextResponse.json({ error: "Permission documentaire non accordée par l'Owner." }, { status: 403 });
    }
  } else if (!userRole || !["ADMIN", "OWNER"].includes(userRole)) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      actorRole: userRole || "UNKNOWN",
      action: "DOCUMENT_DOWNLOAD",
      targetType: "CANDIDATE_DOCUMENT",
      targetId: document.id,
      details: {
        fileName: document.name,
        docType: document.docType,
        candidateId: document.candidateId,
        access: "download",
      },
    },
  });

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
