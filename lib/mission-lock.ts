import { prisma } from "@/lib/prisma";

const IDENTIFYING_FIELDS = ["name", "email", "phone", "phonePrefix", "documents"] as const;

export type MissionPresentationView = {
  id: string;
  missionId: string;
  applicationId: string;
  state: string;
  financialConditionStatus: string;
  presentedAt: Date;
  candidate: {
    headline: string | null;
    bio: string | null;
    location: string | null;
    country: string | null;
    skills: unknown;
    experienceYears: number | null;
  };
  unlocked: boolean;
  identifyingFields: typeof IDENTIFYING_FIELDS | null;
};

export function isIdentityUnlocked(state: string, financialConditionStatus: string) {
  return state === "IDENTITE_DEBLOQUEE" && financialConditionStatus === "CONFIRMED";
}

export async function getCompanyMissionPresentation(presentationId: string, companyId: string) {
  const presentation = await prisma.missionPresentation.findFirst({
    where: { id: presentationId, companyId },
    include: {
      mission: { select: { id: true, companyId: true, status: true, financialCondition: true, financialConditionStatus: true } },
      candidate: {
        select: {
          id: true,
          headline: true,
          bio: true,
          location: true,
          country: true,
          phonePrefix: true,
          phone: true,
          skills: true,
          experienceYears: true,
          user: { select: { name: true, email: true } },
          documents: { select: { id: true, name: true, url: true, type: true } },
        },
      },
    },
  });

  if (!presentation || presentation.mission.companyId !== companyId) {
    throw new Error("Présentation inaccessible");
  }

  const unlocked = isIdentityUnlocked(presentation.state, presentation.financialConditionStatus);

  return {
    presentation,
    view: {
      id: presentation.id,
      missionId: presentation.missionId,
      applicationId: presentation.applicationId,
      state: presentation.state,
      financialConditionStatus: presentation.financialConditionStatus,
      presentedAt: presentation.presentedAt,
      candidate: {
        headline: presentation.candidate.headline,
        bio: presentation.candidate.bio,
        location: presentation.candidate.location,
        country: presentation.candidate.country,
        skills: presentation.candidate.skills,
        experienceYears: presentation.candidate.experienceYears,
      },
      unlocked,
      identifyingFields: unlocked ? IDENTIFYING_FIELDS : null,
      ...(unlocked
        ? {
            candidateIdentity: {
              name: presentation.candidate.user.name,
              email: presentation.candidate.user.email,
              phone: presentation.candidate.phone,
              phonePrefix: presentation.candidate.phonePrefix,
              documents: presentation.candidate.documents,
            },
          }
        : {}),
    } as MissionPresentationView & Record<string, unknown>,
  };
}

export async function createMissionPresentation(input: {
  missionId: string;
  applicationId: string;
  candidateId: string;
  companyId: string;
  actorUserId: string;
}) {
  const [mission, application] = await Promise.all([
    prisma.job.findUnique({ where: { id: input.missionId }, select: { id: true, companyId: true, status: true, financialConditionStatus: true } }),
    prisma.application.findUnique({ where: { id: input.applicationId }, select: { id: true, jobId: true, candidateId: true } }),
  ]);

  if (!mission || mission.companyId !== input.companyId || mission.status !== "OPEN") {
    throw new Error("Mission active et autorisée requise");
  }
  if (!application || application.jobId !== input.missionId || application.candidateId !== input.candidateId) {
    throw new Error("Candidature incohérente avec la mission");
  }

  return prisma.$transaction(async (tx) => {
    const presentation = await tx.missionPresentation.create({
      data: {
        missionId: input.missionId,
        applicationId: input.applicationId,
        candidateId: input.candidateId,
        companyId: input.companyId,
        state: "CANDIDAT_ANONYME",
        financialConditionStatus: mission.financialConditionStatus,
        securityDetails: { createdByUserId: input.actorUserId, source: "RECRUTEMENT_PRIVE_PRESENTATION" },
      },
    });

    await tx.recruitmentHistory.create({
      data: {
        applicationId: input.applicationId,
        jobId: input.missionId,
        actorUserId: input.actorUserId,
        action: "CANDIDAT_PRESENTE_ANONYME",
        toStatus: "CANDIDAT_ANONYME",
        details: { presentationId: presentation.id, companyId: input.companyId },
      },
    });

    return presentation;
  });
}

export async function confirmMissionFinancialCondition(presentationId: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const presentation = await tx.missionPresentation.findUnique({ where: { id: presentationId } });
    if (!presentation) throw new Error("Présentation introuvable");
    if (presentation.state === "IDENTITE_DEBLOQUEE" || presentation.state === "MISSION_TERMINEE") return presentation;

    const updated = await tx.missionPresentation.update({
      where: { id: presentationId },
      data: {
        financialConditionStatus: "CONFIRMED",
        state: "PAIEMENT_OU_CONDITION_CONFIRME",
        conditionConfirmedAt: new Date(),
        securityDetails: { ...(presentation.securityDetails as object | null ?? {}), confirmedByUserId: actorUserId },
      },
    });

    await tx.recruitmentHistory.create({
      data: {
        applicationId: presentation.applicationId,
        jobId: presentation.missionId,
        actorUserId,
        action: "CONDITION_FINANCIERE_CONFIRMEE",
        fromStatus: presentation.state,
        toStatus: "PAIEMENT_OU_CONDITION_CONFIRME",
        details: { presentationId },
      },
    });

    return updated;
  });
}

export async function unlockMissionPresentation(presentationId: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const presentation = await tx.missionPresentation.findUnique({ where: { id: presentationId } });
    if (!presentation) throw new Error("Présentation introuvable");
    if (presentation.financialConditionStatus !== "CONFIRMED") {
      throw new Error("Condition financière non confirmée côté serveur");
    }
    if (presentation.state !== "PAIEMENT_OU_CONDITION_CONFIRME") {
      throw new Error("État de présentation incompatible avec le déblocage");
    }

    const updated = await tx.missionPresentation.update({
      where: { id: presentationId },
      data: { state: "IDENTITE_DEBLOQUEE", unlockedAt: new Date() },
    });

    await tx.recruitmentHistory.create({
      data: {
        applicationId: presentation.applicationId,
        jobId: presentation.missionId,
        actorUserId,
        action: "IDENTITE_CANDIDAT_DEBLOQUEE",
        fromStatus: presentation.state,
        toStatus: "IDENTITE_DEBLOQUEE",
        details: { presentationId },
      },
    });

    return updated;
  });
}
