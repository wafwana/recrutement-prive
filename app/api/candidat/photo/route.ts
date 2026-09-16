import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((value, index) => bytes[index] === value);
}

function isValidImageSignature(bytes: Uint8Array) {
  const isJpeg = hasPrefix(bytes, [0xff, 0xd8, 0xff]);
  const isPng = hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isWebp =
    hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    hasPrefix(bytes.slice(8, 12), [0x57, 0x45, 0x42, 0x50]);
  return { isJpeg, isPng, isWebp };
}

export async function POST(request: Request) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());

  if (!session?.user?.id || session.user.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Accès réservé au candidat authentifié." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Fichier photo manquant." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_PHOTO_SIZE) {
      return NextResponse.json({ error: "La photo doit être inférieure à 5 Mo." }, { status: 400 });
    }

    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Format d'image non autorisé (JPEG, PNG, WebP acceptés)." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { isJpeg, isPng, isWebp } = isValidImageSignature(new Uint8Array(buffer.slice(0, 12)));
    const signatureMatchesMime =
      (file.type === "image/jpeg" && isJpeg) ||
      (file.type === "image/png" && isPng) ||
      (file.type === "image/webp" && isWebp);

    if (!signatureMatchesMime) {
      return NextResponse.json({ error: "Le contenu binaire ne correspond pas au type d'image déclaré." }, { status: 400 });
    }

    const updatedProfile = await prisma.candidateProfile.update({
      where: { userId: session.user.id },
      data: {
        photoMimeType: file.type,
        photoData: buffer,
      },
      select: { id: true, userId: true, photoMimeType: true },
    });

    return NextResponse.json({ ok: true, profile: updatedProfile, message: "Photo de profil mise à jour avec succès." });
  } catch (err) {
    console.error("[upload candidate photo error]", err);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement de la photo." }, { status: 500 });
  }
}

export async function DELETE() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());

  if (!session?.user?.id || session.user.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Accès réservé au candidat authentifié." }, { status: 403 });
  }

  await prisma.candidateProfile.update({
    where: { userId: session.user.id },
    data: {
      photoMimeType: null,
      photoData: null,
    },
  });

  return NextResponse.json({ ok: true, message: "Photo de profil supprimée." });
}
