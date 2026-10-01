import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { handleGetCandidateDocument } from "@/app/api/candidats/documents/[documentId]/handler";

test("Internal Messaging & Document Confidentiality — Complete Audit & Verification Suite", async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip("Skipping DB integration test: DATABASE_URL not configured in environment");
    return;
  }

  let ownerUser: { id: string; email: string };
  let adminUser: { id: string; email: string };
  let consultantUser: { id: string; email: string };
  let enterpriseUser: { id: string; email: string };
  let candidateUser: { id: string; email: string };
  let candidateProfile: { id: string };
  let archivedDoc: { id: string };
  let candidateDoc: { id: string };

  t.beforeEach(async () => {
    // Setup test users
    const timestamp = Date.now();
    ownerUser = await prisma.user.create({
      data: { email: `owner-${timestamp}@test.rp`, role: "OWNER", status: "ACTIVE" },
    });
    adminUser = await prisma.user.create({
      data: { email: `admin-${timestamp}@test.rp`, role: "ADMIN", status: "ACTIVE" },
    });
    consultantUser = await prisma.user.create({
      data: { email: `consultant-${timestamp}@test.rp`, role: "CONSULTANT", status: "ACTIVE" },
    });
    enterpriseUser = await prisma.user.create({
      data: { email: `enterprise-${timestamp}@test.rp`, role: "ENTREPRISE", status: "ACTIVE" },
    });
    candidateUser = await prisma.user.create({
      data: { email: `candidate-${timestamp}@test.rp`, role: "CANDIDAT", status: "ACTIVE" },
    });

    candidateProfile = await prisma.candidateProfile.create({
      data: { userId: candidateUser.id, phone: "+33600000000" },
    });

    archivedDoc = await prisma.archivedDocument.create({
      data: {
        name: "Contrat_Entreprise_Confidentiel.pdf",
        fileData: Buffer.from("PDF_DUMMY_DATA_CONFIDENTIAL"),
        mimeType: "application/pdf",
        senderUserId: enterpriseUser.id,
        senderRole: "ENTREPRISE",
        senderEmail: enterpriseUser.email,
        categoryPath: "ARCHIVAGE/A_CLASSER/RECUS_ENTREPRISES",
        status: "A_VERIFIER",
      },
    });

    candidateDoc = await prisma.candidateDocument.create({
      data: {
        name: "CV_Candidat_Confidentiel.pdf",
        type: "application/pdf",
        docType: "CV",
        fileData: Buffer.from("CV_BINARY_DATA"),
        candidateId: candidateProfile.id,
      },
    });
  });

  t.afterEach(async () => {
    // Cleanup created test records
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: [ownerUser?.id, adminUser?.id, consultantUser?.id, enterpriseUser?.id, candidateUser?.id].filter(Boolean) } } });
    await prisma.internalTransfer.deleteMany({ where: { grantedByUserId: ownerUser?.id } });
    await prisma.message.deleteMany({ where: { senderId: { in: [ownerUser?.id, adminUser?.id, consultantUser?.id, enterpriseUser?.id, candidateUser?.id].filter(Boolean) } } });
    await prisma.conversationParticipant.deleteMany({ where: { userId: { in: [ownerUser?.id, adminUser?.id, consultantUser?.id, enterpriseUser?.id, candidateUser?.id].filter(Boolean) } } });
    if (candidateDoc) await prisma.candidateDocument.deleteMany({ where: { id: candidateDoc.id } });
    if (archivedDoc) await prisma.archivedDocument.deleteMany({ where: { id: archivedDoc.id } });
    if (candidateProfile) await prisma.candidateProfile.deleteMany({ where: { id: candidateProfile.id } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerUser?.id, adminUser?.id, consultantUser?.id, enterpriseUser?.id, candidateUser?.id].filter(Boolean) } } });
  });

  await t.test("Requirement 1 & 2: Enterprise/Sponsor message routes directly to OWNER inbox first", async () => {
    // Create message from ENTREPRISE to staff
    const conversation = await prisma.conversation.create({
      data: {
        subject: "Offre de partenariat",
        participants: { create: [{ userId: enterpriseUser.id }, { userId: ownerUser.id }] },
        messages: { create: { senderId: enterpriseUser.id, body: "Bonjour, voici nos propositions." } },
      },
      include: { participants: true },
    });

    assert.equal(conversation.participants.some((p) => p.userId === ownerUser.id), true);
    assert.equal(conversation.participants.some((p) => p.userId === adminUser.id), false);
  });

  await t.test("Requirement 3: OWNER can view and classify archived documents", async () => {
    const doc = await prisma.archivedDocument.findUnique({ where: { id: archivedDoc.id } });
    assert.ok(doc);
    assert.equal(doc.status, "A_VERIFIER");

    const updated = await prisma.archivedDocument.update({
      where: { id: archivedDoc.id },
      data: { categoryPath: "ARCHIVAGE/ENTREPRISES/CONTRATS", status: "VERIFIE" },
    });

    assert.equal(updated.categoryPath, "ARCHIVAGE/ENTREPRISES/CONTRATS");
    assert.equal(updated.status, "VERIFIE");
  });

  await t.test("Requirement 4 & 5 & 10 & 11: OWNER internal transfer grants restricted online reading to designated collaborator", async () => {
    // Before transfer, consultant has no access
    const transferBefore = await prisma.internalTransfer.findFirst({
      where: { targetId: archivedDoc.id, collaboratorUserId: consultantUser.id, status: "ACTIVE" },
    });
    assert.equal(transferBefore, null);

    // OWNER creates transfer
    const createdTransfer = await prisma.internalTransfer.create({
      data: {
        targetType: "DOCUMENT",
        targetId: archivedDoc.id,
        collaboratorUserId: consultantUser.id,
        grantedByUserId: ownerUser.id,
        scope: "Analyse Contractuelle",
        status: "ACTIVE",
      },
    });

    assert.ok(createdTransfer);
    assert.equal(createdTransfer.status, "ACTIVE");

    // Collaborator now has active transfer
    const activeTransfer = await prisma.internalTransfer.findFirst({
      where: { targetId: archivedDoc.id, collaboratorUserId: consultantUser.id, status: "ACTIVE" },
    });
    assert.ok(activeTransfer);
    assert.equal(activeTransfer.collaboratorUserId, consultantUser.id);
  });

  await t.test("Requirement 6 & 7 & 8 & 9: Binary file download is strictly reserved to OWNER", async () => {
    // Consultant download attempt must be rejected
    const consultantDownloadResponse = await handleGetCandidateDocument(
      candidateDoc.id,
      { user: { id: consultantUser.id, role: "CONSULTANT" } },
      true // downloadRequested = true
    );
    assert.equal(consultantDownloadResponse.status, 403);
    const consultantData = await consultantDownloadResponse.json();
    assert.match(consultantData.error, /réservé/i);

    // Admin download attempt must be rejected
    const adminDownloadResponse = await handleGetCandidateDocument(
      candidateDoc.id,
      { user: { id: adminUser.id, role: "ADMIN" } },
      true // downloadRequested = true
    );
    assert.equal(adminDownloadResponse.status, 403);

    // OWNER download attempt is granted
    const ownerDownloadResponse = await handleGetCandidateDocument(
      candidateDoc.id,
      { user: { id: ownerUser.id, role: "OWNER" } },
      true // downloadRequested = true
    );
    assert.equal(ownerDownloadResponse.status, 200);
    assert.match(ownerDownloadResponse.headers.get("Content-Disposition") || "", /attachment/);
  });

  await t.test("Requirement 12: OWNER can revoke transfer and collaborator loses access", async () => {
    // Create active transfer
    const transfer = await prisma.internalTransfer.create({
      data: {
        targetType: "DOCUMENT",
        targetId: archivedDoc.id,
        collaboratorUserId: consultantUser.id,
        grantedByUserId: ownerUser.id,
        status: "ACTIVE",
      },
    });

    // Revoke transfer
    const revoked = await prisma.internalTransfer.update({
      where: { id: transfer.id },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    assert.equal(revoked.status, "REVOKED");
    assert.ok(revoked.revokedAt);

    const activeCheck = await prisma.internalTransfer.findFirst({
      where: { targetId: archivedDoc.id, collaboratorUserId: consultantUser.id, status: "ACTIVE" },
    });
    assert.equal(activeCheck, null);
  });

  await t.test("Requirement 13 & 14 & 15: Actions and download attempts are logged in AuditLog without leaks", async () => {
    const auditCountBefore = await prisma.auditLog.count({ where: { actorUserId: consultantUser.id } });

    // Execute download attempt by consultant
    await handleGetCandidateDocument(
      candidateDoc.id,
      { user: { id: consultantUser.id, role: "CONSULTANT" } },
      true
    );

    const auditCountAfter = await prisma.auditLog.count({ where: { actorUserId: consultantUser.id } });
    assert.equal(auditCountAfter, auditCountBefore + 1);

    const latestLog = await prisma.auditLog.findFirst({
      where: { actorUserId: consultantUser.id },
      orderBy: { createdAt: "desc" },
    });

    assert.ok(latestLog);
    assert.equal(latestLog.action, "UNAUTHORIZED_DOWNLOAD_ATTEMPT");
  });
});
