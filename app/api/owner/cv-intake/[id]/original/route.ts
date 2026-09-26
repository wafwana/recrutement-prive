import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = getActiveSessionContext() || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  if (!userId || !role || !["OWNER", "ADMIN", "CONSULTANT"].includes(role)) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  if (!(await hasPermission(userId, role, "CV_INTAKE"))) return NextResponse.json({ error: "Permission d’import CV non accordée par l’Owner." }, { status: 403 });
  const { id } = await context.params;
  const doc = await prisma.cvIntake.findUnique({ where: { id }, select: { name: true, mimeType: true, fileData: true, originalSha256: true } });
  if (!doc) return NextResponse.json({ error: "CV introuvable." }, { status: 404 });

  const body = new ArrayBuffer(doc.fileData.byteLength);
  new Uint8Array(body).set(doc.fileData);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.name.replace(/["\\]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-RP-Original-SHA256": doc.originalSha256,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
