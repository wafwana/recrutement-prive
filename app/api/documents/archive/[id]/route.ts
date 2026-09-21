import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

function isSensitive(categoryPath: string) {
  return /^(ARCHIVAGE\/(FINANCE|COMPTABILITE|CONTRATS)(\/|$))/i.test(categoryPath);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const role = session.user.role || "";
  if (role !== "OWNER" && role !== "ADMIN" && role !== "CONSULTANT") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (role !== "OWNER" && !(await hasPermission(session.user.id, role, "DOCUMENTS_VIEW"))) {
    return NextResponse.json({ error: "Permission requise : consulter les documents." }, { status: 403 });
  }

  const { id } = await context.params;
  const doc = await prisma.archivedDocument.findUnique({
    where: { id },
    select: { name: true, mimeType: true, fileData: true, categoryPath: true },
  });
  if (!doc || !doc.fileData) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  if (role !== "OWNER" && isSensitive(doc.categoryPath)) {
    return NextResponse.json({ error: "Document sensible réservé à l'Owner." }, { status: 403 });
  }

  return new NextResponse(doc.fileData, {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
