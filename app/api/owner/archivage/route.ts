import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DocumentArchiveStatus } from "@prisma/client";
import { hasPermission } from "@/lib/auth/permissions";

async function getAuthorizedUser(permission: "DOCUMENTS_VIEW" | "DOCUMENTS_ANALYZE" | "DOCUMENTS_ARCHIVE") {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  if (!session?.user?.id) return null;
  if (session.user.role === "OWNER") return session.user;
  if ((session.user.role === "ADMIN" || session.user.role === "CONSULTANT") &&
      await hasPermission(session.user.id, session.user.role, permission)) {
    return session.user;
  }
  return null;
}

async function requireOwner() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  if (!session?.user?.id || session.user.role !== "OWNER") return null;
  return session.user;
}

export async function GET(request: Request) {
  const owner = await getAuthorizedUser("DOCUMENTS_VIEW");
  if (!owner) {
    return NextResponse.json({ error: "Vous n'avez pas l'autorisation de consulter les archives." }, { status: 403 });
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
  const owner = await getAuthorizedUser("DOCUMENTS_ARCHIVE");
  if (!owner) {
    return NextResponse.json({ error: "Vous n'avez pas l'autorisation de répertorier ou reclasser les documents." }, { status: 403 });
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


function analyzeDocument(document: {
  name: string;
  originalName: string | null;
  mimeType: string | null;
  size: number | null;
  categoryPath: string;
  docType: string | null;
}) {
  const sourceName = document.originalName || document.name;
  const extension = sourceName.includes(".") ? sourceName.split(".").pop()!.toLowerCase() : "";
  const mime = document.mimeType || "application/octet-stream";
  const typeMap: Record<string, string> = {
    pdf: "PDF",
    doc: "DOCUMENT",
    docx: "DOCUMENT",
    xls: "TABLEUR",
    xlsx: "TABLEUR",
    csv: "TABLEUR",
    jpg: "IMAGE",
    jpeg: "IMAGE",
    png: "IMAGE",
    webp: "IMAGE",
    txt: "TEXTE",
  };
  const detectedType = typeMap[extension] || (mime.startsWith("image/") ? "IMAGE" : mime.startsWith("text/") ? "TEXTE" : "AUTRE");
  const category = document.categoryPath || "ARCHIVE / À CLASSER";
  return {
    originalName: sourceName,
    extension: extension || null,
    mimeType: mime,
    size: document.size,
    detectedType,
    categoryPath: category,
    indexedAt: new Date().toISOString(),
    needsOwnerReview: !document.docType || document.categoryPath === "ARCHIVE / À CLASSER",
  };
}

export async function POST(request: Request) {
  const owner = await getAuthorizedUser("DOCUMENTS_ANALYZE");
  if (!owner) return NextResponse.json({ error: "Vous n'avez pas l'autorisation d'analyser les documents." }, { status: 403 });

  let body: { documentId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide." }, { status: 400 }); }
  if (!body.documentId) return NextResponse.json({ error: "documentId requis." }, { status: 400 });

  const document = await prisma.archivedDocument.findUnique({ where: { id: body.documentId } });
  if (!document) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });

  const analysis = analyzeDocument(document);
  const updated = await prisma.archivedDocument.update({
    where: { id: document.id },
    data: {
      docType: document.docType || analysis.detectedType,
      status: analysis.needsOwnerReview ? "A_VERIFIER" : document.status,
      verificationNotes: JSON.stringify({
        action: "ANALYSE_ET_REPERTOIRE",
        detectedType: analysis.detectedType,
        extension: analysis.extension,
        mimeType: analysis.mimeType,
        size: analysis.size,
      }),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: owner.id,
      actorRole: "OWNER",
      action: "ANALYZE_INDEX_DOCUMENT",
      targetType: "ARCHIVED_DOCUMENT",
      targetId: document.id,
      details: analysis,
    },
  });

  return NextResponse.json({ document: updated, analysis });
}

export async function DELETE(request: Request) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Accès strictement réservé à l'Owner." }, { status: 403 });

  let body: { documentId?: string; reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide." }, { status: 400 }); }
  if (!body.documentId) return NextResponse.json({ error: "documentId requis." }, { status: 400 });
  if (!body.reason || body.reason.trim().length < 5) {
    return NextResponse.json({ error: "Un motif de retrait d'au moins 5 caractères est obligatoire." }, { status: 400 });
  }

  const document = await prisma.archivedDocument.findUnique({
    where: { id: body.documentId },
    select: { id: true, name: true, categoryPath: true, senderEmail: true, senderRole: true, mimeType: true, size: true },
  });
  if (!document) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });

  await prisma.archivedDocument.delete({ where: { id: document.id } });
  await prisma.auditLog.create({
    data: {
      actorUserId: owner.id,
      actorRole: "OWNER",
      action: "REMOVE_ARCHIVED_DOCUMENT",
      targetType: "ARCHIVED_DOCUMENT",
      targetId: document.id,
      details: { ...document, reason: body.reason.trim() },
    },
  });

  return NextResponse.json({ ok: true, removedDocumentId: document.id });
}
