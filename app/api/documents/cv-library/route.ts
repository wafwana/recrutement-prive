import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export async function GET(request: Request) {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role ?? "") || !(await hasPermission(userId, role, "DOCUMENTS_VIEW"))) {
    return NextResponse.json({ error: "Permission de consultation documentaire non accordée par l'Owner." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const docs = await prisma.candidateDocument.findMany({
    where: {
      docType: "CV",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { folderPath: { contains: q, mode: "insensitive" } },
              { candidate: { user: { name: { contains: q, mode: "insensitive" } } } },
              { candidate: { user: { email: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      name: true,
      folderPath: true,
      analyzedAt: true,
      isPrimaryCv: true,
      analysis: true,
      createdAt: true,
      candidate: { select: { id: true, user: { select: { name: true, email: true } } } },
    },
  });

  const intakeDocs = await prisma.cvIntake.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true, name: true, folderPath: true, analyzedAt: true, analysis: true,
      createdAt: true, candidateId: true, candidateName: true, candidateEmail: true, status: true,
    },
  });

  const candidateDocKeys = new Set(
    docs.map((doc) => `${doc.candidate?.id || ""}::${doc.name}::${doc.folderPath}`),
  );

  const intakeOnly = intakeDocs
    .filter((doc) => !candidateDocKeys.has(`${doc.candidateId || ""}::${doc.name}::${doc.folderPath}`))
    .map((doc) => ({
      id: doc.id,
      name: doc.name,
      folderPath: doc.folderPath,
      analyzedAt: doc.analyzedAt,
      isPrimaryCv: true,
      analysis: doc.analysis,
      createdAt: doc.createdAt,
      candidate: doc.candidateId || doc.candidateName || doc.candidateEmail
        ? { id: doc.candidateId, user: { name: doc.candidateName, email: doc.candidateEmail } }
        : null,
      source: "CV_INTAKE",
      status: doc.status,
    }));

  const documents = [
    ...docs.map((doc) => ({ ...doc, source: "CANDIDATE_DOCUMENT" })),
    ...intakeOnly,
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const folders = [...new Set(documents.map((doc) => doc.folderPath))].sort();
  return NextResponse.json({ documents: documents.slice(0, 5000), folders });
}
