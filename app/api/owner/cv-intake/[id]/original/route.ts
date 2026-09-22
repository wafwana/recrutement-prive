import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = getActiveSessionContext() || (await auth());
  if (session?.user?.role !== "OWNER") return NextResponse.json({ error: "Accès Owner requis." }, { status: 403 });
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
