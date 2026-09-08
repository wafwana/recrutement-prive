import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function applyCandidateToJob(userId: string, jobId: string, notes?: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, status: "OPEN" },
  });
  if (!job) {
    throw new Error("L'offre d'emploi n'est plus ouverte aux candidatures.");
  }

  const profile = await prisma.candidateProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const existingApp = await prisma.application.findUnique({
    where: { candidateId_jobId: { candidateId: profile.id, jobId } },
  });

  if (existingApp) {
    throw new Error("Vous avez déjà postulé à cette offre d'emploi.");
  }

  try {
    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          candidateId: profile.id,
          userId,
          jobId,
          status: "SUBMITTED",
          notes: notes ? notes.trim().slice(0, 1000) : null,
        },
      });

      await tx.recruitmentHistory.create({
        data: {
          applicationId: app.id,
          jobId,
          actorUserId: userId,
          action: "APPLICATION_SUBMITTED",
          toStatus: "SUBMITTED",
          details: { source: "CANDIDAT_PORTAL" },
        },
      });

      return app;
    });

    return application;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Vous avez déjà postulé à cette offre d'emploi.");
    }
    throw error;
  }
}
