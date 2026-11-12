import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateUploadedDocument } from "@/lib/security/file-validation";
import { scanBufferWithClamAV } from "@/lib/security/file-scan";

const DOC_TYPES = new Set(["CV", "DIPLOME", "CERTIFICAT", "IDENTITE", "AUTRE"]);

export async function POST(request: Request) {
  const session = getActiveSessionContext() || await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Cette action est réservée à l’OWNER." }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const candidateId = String(form.get("candidateId") || "").trim();
    const file = form.get("file");
    const requestedType = String(form.get("docType") || "AUTRE").trim().toUpperCase();
    if (!candidateId) return NextResponse.json({ error: "Fiche candidat manquante." }, { status: 400 });
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Sélectionnez un fichier." }, { status: 400 });

    const validation = await validateUploadedDocument(file);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

    const profile = await prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Fiche candidat introuvable." }, { status: 404 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const scan = await scanBufferWithClamAV(buffer);
    if (scan.status === "infected") return NextResponse.json({ error: "Le fichier a été bloqué par l’antivirus." }, { status: 422 });
    if (scan.status === "unavailable") {
      console.warn("[owner-candidate-document] antivirus unavailable; upload continues after signature validation", scan.reason);
    }

    const docType = DOC_TYPES.has(requestedType) ? requestedType : "AUTRE";
    const safeName = file.name.replace(/[\\/\\u0000]/g, "").slice(0, 180) || "document";
    const isPrimaryCv = docType === "CV";
    const document = await prisma.$transaction(async (tx) => {
      if (isPrimaryCv) {
        await tx.candidateDocument.updateMany({
          where: { candidateId: profile.id, docType: "CV", isPrimaryCv: true },
          data: { isPrimaryCv: false },
        });
      }
      const created = await tx.candidateDocument.create({
        data: {
          candidateId: profile.id,
          name: safeName,
          fileData: buffer,
          type: file.type || "application/octet-stream",
          docType,
          folderPath: isPrimaryCv ? "CANDIDATS/A_CLASSER/A_VERIFIER/CV" : "CANDIDATS/A_CLASSER/A_VERIFIER",
          isPrimaryCv,
          analysis: {
            provenance: "OWNER_MANUAL_UPLOAD",
            uploadedByUserId: session.user.id,
            uploadedByRole: "OWNER",
          },
        },
        select: { id: true, name: true },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          actorRole: "OWNER",
          action: "OWNER_CANDIDATE_DOCUMENT_UPLOAD",
          targetType: "CANDIDATE_DOCUMENT",
          targetId: created.id,
          details: { candidateId: profile.id, fileName: safeName, docType, provenance: "OWNER_MANUAL_UPLOAD" },
        },
      });
      return created;
    });

    revalidatePath("/espace/owner/candidats");
    revalidatePath("/espace/candidat");
    return NextResponse.redirect(new URL("/espace/owner/candidats?documentAdded=1", request.url), 303);
  } catch (error) {
    console.error("[owner-candidate-document-upload]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Le document n’a pas pu être ajouté. Réessayez avec un fichier PDF, DOC, DOCX ou JPEG de 10 Mo maximum." }, { status: 500 });
  }
}
