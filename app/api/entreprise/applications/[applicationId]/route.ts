import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";
import { isIdentityUnlocked } from "@/lib/mission-lock";

const bodySchema = z.object({
  status: z.enum(["SUBMITTED", "REVIEWING", "INTERVIEW", "SHORTLISTED", "REJECTED", "HIRED"]),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    const { applicationId } = await params;
    const existing = await prisma.application.findUnique({ where: { id: applicationId }, select: { job: { select: { companyId: true } } } });
    if (!existing) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
    const access = await requireCompanyAccess(existing.job.companyId);
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        job: { companyId: access.companyId },
        presentations: { some: { companyId: access.companyId } },
      },
      include: {
        job: true,
        candidate: { include: { user: true, documents: true } },
        presentations: { where: { companyId: access.companyId }, orderBy: { presentedAt: "desc" }, take: 1 },
        history: { include: { actor: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!application || application.presentations.length === 0) {
      return NextResponse.json({ error: "Candidature introuvable ou non présentée" }, { status: 404 });
    }

    const presentation = application.presentations[0];
    const unlocked = isIdentityUnlocked(presentation.state, presentation.financialConditionStatus);

    return NextResponse.json({
      id: application.id,
      status: application.status,
      notes: application.notes,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      job: application.job,
      presentation: {
        id: presentation.id,
        state: presentation.state,
        financialConditionStatus: presentation.financialConditionStatus,
        presentedAt: presentation.presentedAt,
        unlocked,
      },
      history: application.history,
      candidate: {
        id: application.candidate.id,
        headline: application.candidate.headline,
        bio: application.candidate.bio,
        location: application.candidate.location,
        country: application.candidate.country,
        skills: application.candidate.skills,
        experienceYears: application.candidate.experienceYears,
        ...(unlocked
          ? {
              name: application.candidate.user.name,
              email: application.candidate.user.email,
              phone: application.candidate.phone,
              phonePrefix: application.candidate.phonePrefix,
              documents: application.candidate.documents.map((d) => ({
                id: d.id,
                name: d.name,
                type: d.type,
              })),
            }
          : {
              name: "Candidat présenté par Recrutement Privé",
              documents: [],
            }),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Accès refusé" }, { status: 403 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    const { applicationId } = await params;
    const existing = await prisma.application.findFirst({
      where: {
        id: applicationId,
        presentations: { some: {} },
      },
      select: { jobId: true, status: true, job: { select: { companyId: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Candidature introuvable ou non disponible" }, { status: 404 });
    const access = await requireCompanyAccess(existing.job.companyId);

    const isPresented = await prisma.missionPresentation.findFirst({
      where: { applicationId, companyId: access.companyId },
    });
    if (!isPresented) {
      return NextResponse.json({ error: "Accès refusé : la candidature n'a pas été présentée à cette entreprise" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Mise à jour invalide" }, { status: 400 });

    const application = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: parsed.data.status,
          ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        },
      });
      await tx.recruitmentHistory.create({
        data: {
          applicationId,
          jobId: existing.jobId,
          actorUserId: access.userId,
          action: existing.status === parsed.data.status ? "APPLICATION_UPDATED" : "APPLICATION_STATUS_CHANGED",
          fromStatus: existing.status,
          toStatus: parsed.data.status,
          details: parsed.data.notes !== undefined ? { notesUpdated: true } : undefined,
        },
      });
      return updated;
    });

    return NextResponse.json(application);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible de modifier la candidature" }, { status: 403 });
  }
}
