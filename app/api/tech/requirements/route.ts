import { NextRequest, NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { analyzeRequirementsLocally } from "@/lib/tech/analyzer";
import { z } from "zod";

const createRequirementSchema = z.object({
  techProspectId: z.string().min(1, "L'identifiant du prospect est requis"),
  title: z.string().min(1, "Le titre est requis").max(200),
  description: z.string().max(10000).optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  documentUrl: z.string().max(1000).optional().nullable(),
  fileSize: z.number().int().nonnegative().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
  }

  const role = session.user.role as string;
  const isAllowed = await hasPermission(session.user.id, role, "TECH_SOLUTIONS_MANAGE");
  if (!isAllowed) {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const techProspectId = searchParams.get("techProspectId");
  const status = searchParams.get("status");

  const where: any = {};
  if (techProspectId) where.techProspectId = techProspectId;
  if (status && status !== "ALL") where.status = status;

  const docs = await prisma.techRequirementDoc.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      techProspect: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          contactEmail: true,
          status: true,
        },
      },
    },
    take: 100,
  });

  return NextResponse.json({ ok: true, data: docs });
}

export async function POST(req: NextRequest) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
  }

  const role = session.user.role as string;
  const isAllowed = await hasPermission(session.user.id, role, "TECH_SOLUTIONS_MANAGE");
  if (!isAllowed) {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createRequirementSchema.parse(body);

    // Vérifier l'existence du prospect
    const prospect = await prisma.techProspect.findUnique({
      where: { id: parsed.techProspectId },
    });
    if (!prospect) {
      return NextResponse.json({ ok: false, error: "Prospect introuvable" }, { status: 404 });
    }

    // Exécuter l'analyse technique déterministe
    const analysis = analyzeRequirementsLocally(parsed.title, parsed.description || "");

    const doc = await prisma.techRequirementDoc.create({
      data: {
        techProspectId: parsed.techProspectId,
        title: parsed.title,
        description: parsed.description || null,
        fileName: parsed.fileName || null,
        documentUrl: parsed.documentUrl || null,
        fileSize: parsed.fileSize || null,
        status: "ANALYSE_TERMINEE",
        featuresAnalysis: analysis.functionalCategories as any,
        estimatedQuote: {
          reusabilityPercentage: analysis.globalReusabilityPercentage,
          dependencies: analysis.technicalDependencies,
          risk: analysis.riskAssessment,
          effort: analysis.estimatedEffortDays,
          pricing: analysis.pricingRecommendation,
        } as any,
        createdByUserId: session.user.id,
      },
    });

    // Mettre à jour le statut du prospect si nouveau
    if (prospect.status === "NOUVEAU" || prospect.status === "A_QUALIFIER") {
      await prisma.techProspect.update({
        where: { id: prospect.id },
        data: { status: "CDC_RECU" },
      });
    }

    return NextResponse.json({ ok: true, data: doc }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: err.issues?.[0]?.message || "Validation invalide" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: err.message || "Erreur serveur" }, { status: 500 });
  }
}
