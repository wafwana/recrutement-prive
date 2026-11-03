"use server";

import { revalidatePath } from "next/cache";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireOwnerUserId(): Promise<string> {
  let session = getActiveSessionContext();
  if (!session) {
    try {
      session = await auth();
    } catch {
      // Fail closed outside a valid authenticated request context.
    }
  }

  if (!session?.user?.id || session.user.role !== "OWNER") {
    throw new Error("Seul l'OWNER peut présenter un candidat à une entreprise.");
  }
  return session.user.id;
}

export async function presentCandidateToCompany(applicationId: string) {
  const ownerUserId = await requireOwnerUserId();
  const normalizedApplicationId = applicationId.trim();
  if (!normalizedApplicationId || normalizedApplicationId.length > 128) {
    throw new Error("Candidature invalide.");
  }

  const jobId = await prisma.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { id: normalizedApplicationId },
      select: {
        id: true,
        jobId: true,
        candidateId: true,
        status: true,
        job: { select: { companyId: true, title: true } },
        candidate: { select: { userId: true } },
      },
    });
    if (!application) throw new Error("Candidature introuvable.");
    if (application.status === "REJECTED" || application.status === "HIRED") {
      throw new Error("Cette candidature ne peut plus être présentée.");
    }

    const existing = await tx.missionPresentation.findFirst({
      where: { applicationId: application.id, companyId: application.job.companyId },
      select: { id: true },
    });
    if (existing) return application.jobId;

    const companyOwner = await tx.companyMember.findFirst({
      where: {
        companyId: application.job.companyId,
        role: "OWNER",
        user: { status: "ACTIVE" },
      },
      orderBy: { createdAt: "asc" },
      select: { userId: true },
    });
    const companyContact = companyOwner ?? await tx.companyMember.findFirst({
      where: {
        companyId: application.job.companyId,
        user: { status: "ACTIVE" },
      },
      orderBy: { createdAt: "asc" },
      select: { userId: true },
    });
    if (!companyContact) {
      throw new Error("Aucun interlocuteur entreprise actif : présentation impossible.");
    }

    const presentation = await tx.missionPresentation.create({
      data: {
        missionId: application.jobId,
        applicationId: application.id,
        candidateId: application.candidateId,
        companyId: application.job.companyId,
        state: "MISSION_ACTIVE",
        anonymousMessagingEnabled: true,
        candidateAlias: `Candidat #${application.candidateId.slice(-6).toUpperCase()}`,
        companyAlias: `Entreprise #${application.job.companyId.slice(-6).toUpperCase()}`,
        candidateUserId: application.candidate.userId,
        companyUserId: companyContact.userId,
        financialConditionStatus: "PENDING",
        securityDetails: {
          identityProtected: true,
          directCoordinatesBlocked: true,
          presentedByOwner: true,
        },
      },
    });

    if (application.status !== "SHORTLISTED") {
      await tx.application.update({
        where: { id: application.id },
        data: { status: "SHORTLISTED" },
      });
    }

    await tx.recruitmentHistory.create({
      data: {
        applicationId: application.id,
        jobId: application.jobId,
        actorUserId: ownerUserId,
        action: "OWNER_CANDIDATE_PRESENTED",
        fromStatus: application.status,
        toStatus: "SHORTLISTED",
        details: {
          companyId: application.job.companyId,
          missionPresentationId: presentation.id,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: ownerUserId,
        actorRole: "OWNER",
        action: "OWNER_CANDIDATE_PRESENTED",
        targetType: "APPLICATION",
        targetId: application.id,
        details: {
          companyId: application.job.companyId,
          jobId: application.jobId,
          missionPresentationId: presentation.id,
        },
      },
    });

    return application.jobId;
  });

  revalidatePath("/espace/owner");
  revalidatePath("/espace/owner/candidatures");
  revalidatePath("/espace/entreprise");
  revalidatePath(`/espace/entreprise/offres/${jobId}`);
}
