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
      createdAt: true,
      candidate: { select: { id: true, user: { select: { name: true, email: true } } } },
    },
  });

  const folders = [...new Set(docs.map((doc) => doc.folderPath))].sort();
  return NextResponse.json({ documents: docs, folders });
}
