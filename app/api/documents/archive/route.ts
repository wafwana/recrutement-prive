import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

function isSensitive(categoryPath: string) {
  return /^(ARCHIVAGE\/(FINANCE|COMPTABILITE|CONTRATS)(\/|$))/i.test(categoryPath);
}

async function getSession() {
  const active = getActiveSessionContext();
  return active || (await auth());
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const role = session.user.role || "";
  if (role !== "OWNER" && role !== "ADMIN" && role !== "CONSULTANT") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (role !== "OWNER" && !(await hasPermission(session.user.id, role, "DOCUMENTS_VIEW"))) {
    return NextResponse.json({ error: "Permission requise : consulter les documents." }, { status: 403 });
  }

  const all = await prisma.archivedDocument.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, mimeType: true, size: true, senderRole: true,
      senderEmail: true, categoryPath: true, status: true, docType: true, createdAt: true,
    },
  });
  const documents = role === "OWNER" ? all : all.filter((doc) => !isSensitive(doc.categoryPath));
  return NextResponse.json({ documents });
}
