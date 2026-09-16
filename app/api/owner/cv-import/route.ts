import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { processInboundEmailCv } from "@/lib/email/cv-import";

async function requireOwner() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  if (!session?.user?.id || session.user.role !== "OWNER") return null;
  return session.user;
}

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Accès strictement réservé à l'Owner." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const messageId = String(formData.get("messageId") || `MSG-${Date.now()}`).trim();
    const senderEmail = String(formData.get("senderEmail") || "").trim().toLowerCase();
    const senderName = String(formData.get("senderName") || "").trim();
    const receivedAtInput = formData.get("receivedAt") ? String(formData.get("receivedAt")) : undefined;

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Fichier CV manquant." }, { status: 400 });
    }

    if (!senderEmail || !senderEmail.includes("@")) {
      return NextResponse.json({ error: "Adresse email expéditeur invalide." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const receivedAt = receivedAtInput ? new Date(receivedAtInput) : new Date();

    const result = await processInboundEmailCv({
      messageId,
      senderEmail,
      senderName,
      receivedAt,
      fileName: file.name,
      fileBuffer: buffer,
      mimeType: file.type,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Erreur lors de l'import du CV." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      result,
      message: result.candidateMatched
        ? `CV de ${senderEmail} importé et rattaché avec succès.`
        : `CV de ${senderEmail} importé et placé dans ARCHIVAGE/A_CLASSER/A_VERIFIER.`,
    });
  } catch (err) {
    console.error("[CV Email Import Error]", err);
    return NextResponse.json({ error: "Erreur serveur lors du traitement de l'import CV." }, { status: 500 });
  }
}
