import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";

async function ownerOnly() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  if (!session?.user?.id) return false;
  return session.user.role === "OWNER";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await ownerOnly())) {
    return NextResponse.json({ error: "Accès strictement réservé à l'Owner." }, { status: 403 });
  }

  const { id } = await params;
  const outflow = await prisma.financialOutflow.findUnique({
    where: { id },
    select: { documentData: true, documentMimeType: true, documentName: true },
  });

  if (!outflow?.documentData) {
    return NextResponse.json({ error: "Pièce justificative introuvable." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(outflow.documentData), {
    status: 200,
    headers: {
      "Content-Type": outflow.documentMimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${(outflow.documentName || "justificatif").replace(/["\\\\\\r\\n]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
