import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_LOGO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5 MB

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((value, index) => bytes[index] === value);
}

export async function POST(request: Request) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());

  if (!session?.user?.id || session.user.role !== "ENTREPRISE") {
    return NextResponse.json({ error: "Accès réservé aux représentants de l'entreprise authentifiés." }, { status: 403 });
  }

  try {
    const membership = await prisma.companyMember.findFirst({
      where: { userId: session.user.id },
      select: { companyId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Aucune entreprise rattachée à cet utilisateur." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Fichier logo/photo manquant." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_LOGO_SIZE) {
      return NextResponse.json({ error: "Le logo doit être inférieur à 5 Mo." }, { status: 400 });
    }

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Format d'image non autorisé (JPEG, PNG, WebP acceptés)." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const bytes = new Uint8Array(buffer.slice(0, 8));

    const isJpeg = hasPrefix(bytes, [0xff, 0xd8, 0xff]);
    const isPng = hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47]);
    const isWebp = hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]);

    if (!isJpeg && !isPng && !isWebp) {
      return NextResponse.json({ error: "Type d'image binaire non conforme." }, { status: 400 });
    }

    const updatedCompany = await prisma.company.update({
      where: { id: membership.companyId },
      data: {
        logoMimeType: file.type,
        logoData: buffer,
      },
      select: { id: true, name: true, logoMimeType: true },
    });

    return NextResponse.json({ ok: true, company: updatedCompany, message: "Logo d'entreprise mis à jour avec succès." });
  } catch (err) {
    console.error("[upload company logo error]", err);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement du logo." }, { status: 500 });
  }
}

export async function DELETE() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());

  if (!session?.user?.id || session.user.role !== "ENTREPRISE") {
    return NextResponse.json({ error: "Accès réservé aux représentants de l'entreprise authentifiés." }, { status: 403 });
  }

  const membership = await prisma.companyMember.findFirst({
    where: { userId: session.user.id },
    select: { companyId: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Aucune entreprise rattachée à cet utilisateur." }, { status: 404 });
  }

  await prisma.company.update({
    where: { id: membership.companyId },
    data: {
      logoMimeType: null,
      logoData: null,
    },
  });

  return NextResponse.json({ ok: true, message: "Logo d'entreprise supprimé." });
}
