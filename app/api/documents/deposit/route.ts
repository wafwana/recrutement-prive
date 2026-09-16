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

    // Never trust client-supplied entity IDs. Resolve the allowed scope server-side.
    let authorizedCompanyIds: string[] = [];
    if (userRole === "ENTREPRISE") {
      const memberships = await prisma.companyMember.findMany({
        where: { userId },
        select: { companyId: true },
      });
      authorizedCompanyIds = memberships.map((membership) => membership.companyId);

      if (companyId && !authorizedCompanyIds.includes(companyId)) {
        return NextResponse.json({ error: "Accès refusé à cette entreprise." }, { status: 403 });
      }

      if (jobId) {
        const job = await prisma.job.findUnique({ where: { id: jobId }, select: { companyId: true } });
        if (!job || !authorizedCompanyIds.includes(job.companyId)) {
          return NextResponse.json({ error: "Accès refusé à cette offre." }, { status: 403 });
        }
        if (companyId && job.companyId !== companyId) {
          return NextResponse.json({ error: "L'offre ne correspond pas à l'entreprise." }, { status: 400 });
        }
      }

      if (candidateId) {
        const presentation = await prisma.missionPresentation.findFirst({
          where: { candidateId, companyId: { in: authorizedCompanyIds } },
          select: { id: true },
        });
        if (!presentation) {
          return NextResponse.json({ error: "Accès refusé à ce candidat." }, { status: 403 });
        }
      }
    } else if (userRole === "CANDIDAT") {
      if (candidateId) {
        const candidate = await prisma.candidateProfile.findUnique({ where: { id: candidateId }, select: { userId: true } });
        if (!candidate || candidate.userId !== userId) {
          return NextResponse.json({ error: "Accès refusé à ce candidat." }, { status: 403 });
        }
      }
      if (companyId || jobId) {
        return NextResponse.json({ error: "Un candidat ne peut pas rattacher un document à une entreprise ou une offre arbitraire." }, { status: 403 });
      }
    } else if (userRole !== "OWNER" && userRole !== "ADMIN") {
      // Consultants may deposit generic documents, but cannot arbitrarily attach them to protected entities.
      if (companyId || candidateId || jobId) {
        return NextResponse.json({ error: "Rattachement à une entité protégé réservé aux rôles autorisés." }, { status: 403 });
      }
    }

    if (jobId && userRole !== "ENTREPRISE" && userRole !== "OWNER" && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé à cette offre." }, { status: 403 });
    }

    if (jobId && (userRole === "OWNER" || userRole === "ADMIN")) {
      const job = await prisma.job.findUnique({ where: { id: jobId }, select: { companyId: true } });
      if (!job) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
      if (companyId && job.companyId !== companyId) {
        return NextResponse.json({ error: "L'offre ne correspond pas à l'entreprise." }, { status: 400 });
      }
    }

    // Financial metadata is server-trusted only for privileged back-office roles.
    const trustedAmountHt = userRole === "OWNER" || userRole === "ADMIN" ? amountHt : undefined;
    const trustedAmountTva = userRole === "OWNER" || userRole === "ADMIN" ? amountTva : undefined;
    const trustedAmountTtc = userRole === "OWNER" || userRole === "ADMIN" ? amountTtc : undefined;

    const classification = classifyDocument({
      fileName: file.name,
      docType,
      senderRole: userRole,
      companyId,
      candidateId,
      jobId,
      amountHt: trustedAmountHt,
      amountTtc: trustedAmountTtc,
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
        amountHt: trustedAmountHt ?? null,
        amountTva: trustedAmountTva ?? null,
        amountTtc: trustedAmountTtc ?? null,
        year: classification.year,
        month: classification.month,
        quarter: classification.quarter,
      },
    });

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
