import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

function isSensitive(categoryPath: string) {
  return /^ARCHIVAGE\/(FINANCE|COMPTABILITE|CONTRATS)(\/|$)/i.test(categoryPath);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const role = session.user.role || "";
  const userId = session.user.id;
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "true";

  if (role !== "OWNER" && role !== "ADMIN" && role !== "CONSULTANT") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await context.params;

  // Strict enforcement: File download/export of binary is exclusively reserved to OWNER
  if (download && role !== "OWNER") {
    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actorRole: role,
        action: "UNAUTHORIZED_DOWNLOAD_ATTEMPT",
        targetType: "ARCHIVED_DOCUMENT",
        targetId: id,
        details: { access: "download", deniedReason: "Download is exclusively reserved to OWNER" },
      },
    });
    return NextResponse.json({ error: "Le téléchargement est exclusivement réservé au compte OWNER." }, { status: 403 });
  }

  if (role !== "OWNER") {
    // Non-OWNER access check: must have DOCUMENTS_VIEW permission OR explicit internal transfer from OWNER
    const hasDocPermission = await hasPermission(userId, role, "DOCUMENTS_VIEW");
    const activeTransfer = await prisma.internalTransfer.findFirst({
      where: {
        collaboratorUserId: userId,
        status: "ACTIVE",
        OR: [
          { targetType: "DOCUMENT", targetId: id },
          { targetType: "ARCHIVE_FOLDER" },
        ],
      },
    });

    if (!hasDocPermission && !activeTransfer) {
      return NextResponse.json({ error: "Permission requise : consulter les documents." }, { status: 403 });
    }
  }

  const doc = await prisma.archivedDocument.findUnique({
    where: { id },
    select: { name: true, mimeType: true, fileData: true, categoryPath: true },
  });
  if (!doc || !doc.fileData) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  if (role !== "OWNER" && isSensitive(doc.categoryPath)) {
    return NextResponse.json({ error: "Document sensible réservé à l'Owner." }, { status: 403 });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      actorRole: role,
      action: download ? "DOCUMENT_DOWNLOAD" : "DOCUMENT_VIEW",
      targetType: "ARCHIVED_DOCUMENT",
      targetId: id,
      details: { fileName: doc.name, categoryPath: doc.categoryPath, access: download ? "download" : "view" },
    },
  });

  const body = new ArrayBuffer(doc.fileData.byteLength);
  new Uint8Array(body).set(doc.fileData);

  const disposition = download ? "attachment" : "inline";

  return new NextResponse(body, {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(doc.name)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
