"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(["SUBMITTED", "REVIEWING", "INTERVIEW", "SHORTLISTED", "REJECTED", "HIRED"]),
});

export async function updateApplicationStatus(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !["OWNER", "ADMIN"].includes(session.user.role)) {
    throw new Error("Seul Recrutement Privé peut modifier le statut d'une candidature.");
  }

  const parsed = schema.safeParse({
    applicationId: String(formData.get("applicationId") ?? ""),
    status: String(formData.get("status") ?? ""),
  });
  if (!parsed.success) throw new Error("Mise à jour invalide.");

  const application = await prisma.application.findUnique({
    where: { id: parsed.data.applicationId },
    select: { id: true, jobId: true, status: true },
  });
  if (!application) throw new Error("Candidature introuvable.");
  if (application.status === parsed.data.status) return;

  await prisma.$transaction(async (tx) => {
    await tx.application.update({ where: { id: application.id }, data: { status: parsed.data.status } });
    await tx.recruitmentHistory.create({
      data: {
        applicationId: application.id,
        jobId: application.jobId,
        actorUserId: session.user.id,
        action: "APPLICATION_STATUS_CHANGED_BY_OWNER",
        fromStatus: application.status,
        toStatus: parsed.data.status,
      },
    });
  });

  revalidatePath("/espace/owner");
  revalidatePath("/espace/consultant");
  revalidatePath("/espace/entreprise");
  revalidatePath(`/espace/entreprise/offres/${application.jobId}`);
  revalidatePath("/espace/candidat");
}
