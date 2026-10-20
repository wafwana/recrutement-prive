import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  const user = session?.user;

  if (!user || !user.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const role = user.role || "";
  const isOwner = role === "OWNER";
  const isStaff = ["OWNER", "ADMIN", "CONSULTANT"].includes(role);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const docType = searchParams.get("docType");

  if (!isStaff && role !== "CANDIDAT" && role !== "ENTREPRISE") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  let items: Array<{
    id: string;
    name: string;
    folderPath: string;
    docType: string;
    status: string;
    createdAt: Date;
    downloadable: boolean;
  }> = [];

  if (isStaff) {
    const records = await prisma.cvIntake.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { originalName: { contains: q, mode: "insensitive" } },
              { folderPath: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      take: 50,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, folderPath: true, docType: true, status: true, createdAt: true },
    });

    items = records.map((r) => ({
      id: r.id,
      name: r.name,
      folderPath: r.folderPath,
      docType: r.docType || "CV",
      status: r.status,
      createdAt: r.createdAt,
      downloadable: isOwner, // Binary export restricted to OWNER
    }));
  } else if (role === "CANDIDAT") {
    const candidateProfile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (candidateProfile) {
      const docs = await prisma.candidateDocument.findMany({
        where: {
          candidateId: candidateProfile.id,
          ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        },
        take: 30,
        select: { id: true, name: true, folderPath: true, docType: true, createdAt: true },
      });

      items = docs.map((d) => ({
        id: d.id,
        name: d.name,
        folderPath: d.folderPath,
        docType: d.docType || "DOCUMENT",
        status: "ACTIF",
        createdAt: d.createdAt,
        downloadable: true,
      }));
    }
  }

  if (docType) {
    items = items.filter((i) => i.docType === docType);
  }

  return NextResponse.json({
    ok: true,
    total: items.length,
    documents: items,
  });
}
