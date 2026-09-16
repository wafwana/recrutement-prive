import { prisma } from "@/lib/prisma";
import { classifyDocument } from "@/lib/archiving/classifier";
import { validateUploadedDocument } from "@/lib/security/file-validation";
import { sendOwnerAlert } from "@/lib/email/service";

export type InboundCvImportInput = {
  messageId: string;
  senderEmail: string;
  senderName?: string;
  receivedAt?: Date;
  fileName: string;
  fileBuffer: Buffer;
  mimeType?: string;
};

export type CvImportResult = {
  ok: boolean;
  imported: boolean;
  documentId?: string;
  categoryPath?: string;
  candidateMatched: boolean;
  candidateId?: string;
  error?: string;
};

export async function processInboundEmailCv(input: InboundCvImportInput): Promise<CvImportResult> {
  // Idempotency check: check if messageId or exact duplicate import exists
  const existingDoc = await prisma.archivedDocument.findFirst({
    where: {
      OR: [
        { originalName: `${input.messageId}_${input.fileName}` },
        { name: input.fileName, senderEmail: input.senderEmail, docType: "CV" },
      ],
    },
  });

  if (existingDoc) {
    return {
      ok: true,
      imported: false,
      documentId: existingDoc.id,
      categoryPath: existingDoc.categoryPath,
      candidateMatched: Boolean(existingDoc.candidateId),
      candidateId: existingDoc.candidateId || undefined,
      error: "Document ou message déjà importé (idempotence).",
    };
  }

  // File validation
  const mockFile = new File([new Uint8Array(input.fileBuffer)], input.fileName, { type: input.mimeType || "application/pdf" });
  const fileCheck = await validateUploadedDocument(mockFile);
  if (!fileCheck.ok) {
    return { ok: false, imported: false, candidateMatched: false, error: fileCheck.error || "Fichier non conforme." };
  }

  // Candidate matching
  const candidate = await prisma.candidateProfile.findFirst({
    where: {
      user: {
        email: { equals: input.senderEmail.trim().toLowerCase(), mode: "insensitive" },
      },
    },
  });

  const candidateId = candidate?.id;
  const candidateMatched = Boolean(candidateId);

  const receivedDate = input.receivedAt || new Date();

  // Classification: if matched, ARCHIVAGE/CANDIDATS/DOSSIER_CANDIDAT. If ambiguous, ARCHIVAGE/A_CLASSER/A_VERIFIER
  const classification = classifyDocument({
    fileName: input.fileName,
    docType: "CV",
    senderRole: "CANDIDAT",
    candidateId,
    date: receivedDate,
  });

  const categoryPath = candidateMatched ? classification.categoryPath : "ARCHIVAGE/A_CLASSER/A_VERIFIER";
  const status = candidateMatched ? "VERIFIE" : "A_VERIFIER";

  const archivedDoc = await prisma.archivedDocument.create({
    data: {
      name: input.fileName,
      originalName: `${input.messageId}_${input.fileName}`,
      mimeType: input.mimeType || "application/pdf",
      fileData: input.fileBuffer,
      size: input.fileBuffer.length,
      senderUserId: candidate?.userId || "EMAIL_INGEST",
      senderRole: "CANDIDAT_EMAIL",
      senderEmail: input.senderEmail.toLowerCase(),
      categoryPath,
      status,
      docType: "CV",
      candidateId: candidateId || null,
      year: receivedDate.getFullYear(),
      month: receivedDate.getMonth() + 1,
      quarter: Math.ceil((receivedDate.getMonth() + 1) / 3),
      createdAt: receivedDate,
    },
  });

  // Owner notification
  await prisma.ownerNotification.create({
    data: {
      title: candidateMatched ? "CV reçu par email importé et rattaché" : "CV reçu par email à vérifier",
      message: `CV '${input.fileName}' de ${input.senderEmail} reçu le ${receivedDate.toLocaleDateString("fr-FR")}. Emplacement : ${categoryPath}`,
      documentId: archivedDoc.id,
      senderName: input.senderName || input.senderEmail,
      senderRole: "CANDIDAT_EMAIL",
      status: "UNREAD",
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorUserId: "SYSTEM_EMAIL_INGEST",
      actorRole: "SYSTEM",
      action: "IMPORT_EMAIL_CV",
      targetType: "ARCHIVED_DOCUMENT",
      targetId: archivedDoc.id,
      details: {
        messageId: input.messageId,
        senderEmail: input.senderEmail,
        candidateMatched,
        candidateId,
        categoryPath,
        receivedAt: receivedDate.toISOString(),
      },
    },
  });

  await sendOwnerAlert(
    candidateMatched ? "CV Email Importé & Rattaché" : "CV Email à Classer / Vérifier",
    `<p><strong>CV Importé :</strong> ${input.fileName}</p>
     <p><strong>Expéditeur :</strong> ${input.senderEmail}</p>
     <p><strong>Date Réception :</strong> ${receivedDate.toLocaleString("fr-FR")}</p>
     <p><strong>Rattachement Candidat :</strong> ${candidateMatched ? `Oui (${candidateId})` : "Non (Placé dans A_CLASSER/A_VERIFIER)"}</p>
     <p><strong>Emplacement :</strong> <code>${categoryPath}</code></p>`
  );

  return {
    ok: true,
    imported: true,
    documentId: archivedDoc.id,
    categoryPath,
    candidateMatched,
    candidateId,
  };
}

export async function batchBackfillEmailCvs(items: InboundCvImportInput[]): Promise<{ importedCount: number; errorsCount: number }> {
  let importedCount = 0;
  let errorsCount = 0;

  for (const item of items) {
    try {
      const res = await processInboundEmailCv(item);
      if (res.imported) importedCount++;
    } catch (err) {
      console.error("[backfill error for item]", item.messageId, err);
      errorsCount++;
    }
  }

  return { importedCount, errorsCount };
}
