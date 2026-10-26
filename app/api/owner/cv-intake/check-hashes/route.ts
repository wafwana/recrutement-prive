import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export async function POST(request: Request) {
  const session = getActiveSessionContext() || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(session?.user?.role || "")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (!(await hasPermission(userId, session?.user?.role || undefined, "CV_INTAKE"))) {
    return NextResponse.json({ error: "Permission d’import CV non accordée par l’Owner." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const rawHashes: unknown[] = Array.isArray(body.hashes) ? body.hashes : [];
    const hashes: string[] = rawHashes
      .filter((h: unknown): h is string => typeof h === "string" && /^[a-fA-F0-9]{64}$/.test(h))
      .map((h: string) => h.toLowerCase());

    if (!hashes.length) {
      return NextResponse.json({ existing: {} });
    }

    const duplicates = await prisma.cvIntake.findMany({
      where: { originalSha256: { in: hashes } },
      select: { originalSha256: true, id: true, name: true, folderPath: true, status: true },
    });

    const existingMap: Record<string, { id: string; name: string; folderPath: string; status: string }> = {};
    for (const dup of duplicates) {
      existingMap[dup.originalSha256.toLowerCase()] = {
        id: dup.id,
        name: dup.name,
        folderPath: dup.folderPath,
        status: dup.status,
      };
    }

    return NextResponse.json({ existing: existingMap });
  } catch (error) {
    console.error("[cv-intake check-hashes]", error);
    return NextResponse.json({ error: "Erreur lors de la vérification des empreintes SHA-256." }, { status: 500 });
  }
}
