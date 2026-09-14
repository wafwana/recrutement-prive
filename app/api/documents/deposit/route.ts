import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { classifyDocument } from "@/lib/archiving/classifier";
import { validateUploadedDocument } from "@/lib/security/file-validation";
import { sendDepositConfirmation, sendOwnerAlert } from "@/lib/email/service";

export async function POST(request: Request) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = session.user.id;
  const userRole = session.user.role || "CANDIDAT";
  const userEmail = session.user.email || "";

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const docType = String(formData.get("docType") || "").trim();
    const companyId = formData.get("companyId") ? String(formData.get("companyId")) : undefined;
    const candidateId = formData.get("candidateId") ? String(formData.get("candidateId")) : undefined;
    const jobId = formData.get("jobId") ? String(formData.get("jobId")) : undefined;
    const amountHt = formData.get("amountHt") ? parseFloat(String(formData.get("amountHt"))) : undefined;
    const amountTva = formData.get("amountTva") ? parseFloat(String(formData.get("amountTva"))) : undefined;
    const amountTtc = formData.get("amountTtc") ? parseFloat(String(formData.get("amountTtc"))) : undefined;

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const fileCheck = await validateUploadedDocument(file);
    if (!fileCheck.ok) {
      return NextResponse.json({ error: fileCheck.error || "Fichier non conforme." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const classification = classifyDocument({
      fileName: file.name,
      docType,
      senderRole: userRole,
      companyId,
      candidateId,
      jobId,
      amountHt,
      amountTtc,
      date: new Date(),
    });

    const transmissionRef = `DEP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const archivedDoc = await prisma.archivedDocument.create({
      data: {
        name: file.name,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileData: buffer,
        size: file.size,
        senderUserId: userId,
        senderRole: userRole,
        senderEmail: userEmail,
        categoryPath: classification.categoryPath,
        status: classification.status,
        docType: docType || null,
        companyId: companyId || null,
        candidateId: candidateId || null,
        jobId: jobId || null,
        amountHt: amountHt || null,
        amountTva: amountTva || null,
        amountTtc: amountTtc || null,
        year: classification.year,
        month: classification.month,
        quarter: classification.quarter,
      },
    });

    // Create Owner Notification immediately
    await prisma.ownerNotification.create({
      data: {
        title: classification.isAmbiguous ? "Nouveau document à classer" : "Nouveau document déposé",
        message: `Le document '${file.name}' a été transmis par ${userEmail} (${userRole}). Emplacement proposé : ${classification.categoryPath}`,
        documentId: archivedDoc.id,
        senderName: session.user.name || userEmail,
        senderRole: userRole,
        status: "UNREAD",
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actorRole: userRole,
        action: "DOCUMENT_DEPOSIT",
        targetType: "ARCHIVED_DOCUMENT",
        targetId: archivedDoc.id,
        details: {
          fileName: file.name,
          categoryPath: classification.categoryPath,
          transmissionRef,
          isAmbiguous: classification.isAmbiguous,
        },
      },
    });

    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR");
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    // Send emails operational dispatch
    if (userEmail) {
      await sendDepositConfirmation(userEmail, file.name, transmissionRef, dateStr, timeStr);
    }
    await sendOwnerAlert(
      classification.isAmbiguous ? "Document à vérifier / classer" : "Nouveau dépôt documentaire",
      `<p><strong>Document :</strong> ${file.name}</p>
       <p><strong>Expéditeur :</strong> ${userEmail} (${userRole})</p>
       <p><strong>Date & Heure :</strong> ${dateStr} à ${timeStr}</p>
       <p><strong>Référence :</strong> ${transmissionRef}</p>
       <p><strong>Emplacement proposé :</strong> <code>${classification.categoryPath}</code></p>`
    );

    return NextResponse.json({
      ok: true,
      reference: transmissionRef,
      message: `Votre document ${file.name} a bien été transmis à Recrutement Privé le ${dateStr} à ${timeStr}.`,
      confirmation: {
        documentName: file.name,
        date: dateStr,
        time: timeStr,
        reference: transmissionRef,
      },
    });
  } catch (err) {
    console.error("[deposit document error]", err);
    return NextResponse.json({ error: "Erreur lors du traitement du document." }, { status: 500 });
  }
}
