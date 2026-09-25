import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { DocumentArchiveStatus } from "@prisma/client";

async function requireOwner() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  if (!session?.user || !userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) return null;
  if (!(await hasPermission(userId, role, "ARCHIVAGE"))) return null;
  return session.user;
}

export async function GET(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Permission archivage non accordée par l’Owner." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const categoryPath = searchParams.get("categoryPath");
  const status = searchParams.get("status") as DocumentArchiveStatus | null;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
  const quarter = searchParams.get("quarter") ? parseInt(searchParams.get("quarter")!) : undefined;

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (categoryPath) where.categoryPath = { startsWith: categoryPath };
  if (year) where.year = year;
  if (month) where.month = month;
  if (quarter) where.quarter = quarter;

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { senderEmail: { contains: q, mode: "insensitive" } },
      { categoryPath: { contains: q, mode: "insensitive" } },
      { docType: { contains: q, mode: "insensitive" } },
    ];
  }

  const documents = await prisma.archivedDocument.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      mimeType: true,
      size: true,
      senderUserId: true,
      senderRole: true,
      senderEmail: true,
      categoryPath: true,
      status: true,
      docType: true,
      companyId: true,
      candidateId: true,
      jobId: true,
      amountHt: true,
      amountTva: true,
      amountTtc: true,
      year: true,
      month: true,
      quarter: true,
      verificationNotes: true,
      verifiedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ documents });
}

export async function PATCH(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Accès strictement réservé à l'Owner." }, { status: 403 });
  }

  let body: {
    documentId: string;
    newCategoryPath?: string;
    status?: DocumentArchiveStatus;
    notes?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  if (!body.documentId) {
    return NextResponse.json({ error: "documentId requis." }, { status: 400 });
  }

  const existingDoc = await prisma.archivedDocument.findUnique({
    where: { id: body.documentId },
  });

  if (!existingDoc) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  const updatedDoc = await prisma.archivedDocument.update({
    where: { id: body.documentId },
    data: {
      categoryPath: body.newCategoryPath || existingDoc.categoryPath,
      status: body.status || existingDoc.status,
      verificationNotes: body.notes || existingDoc.verificationNotes,
      verifiedAt: new Date(),
      verifiedByUserId: owner.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: owner.id!,
      actorRole: "OWNER",
      action: "RECLASSIFY_DOCUMENT",
      targetType: "ARCHIVED_DOCUMENT",
      targetId: updatedDoc.id,
      details: {
        previousCategoryPath: existingDoc.categoryPath,
        newCategoryPath: updatedDoc.categoryPath,
        previousStatus: existingDoc.status,
        newStatus: updatedDoc.status,
        notes: body.notes,
      },
    },
  });

  return NextResponse.json({ document: updatedDoc });
}
