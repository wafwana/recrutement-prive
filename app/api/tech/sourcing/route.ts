import { NextRequest, NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { calculateQualificationScore, CommercialSignal } from "@/lib/tech/sourcing";
import { z } from "zod";

const sourcingSearchSchema = z.object({
  country: z.string().optional(),
  sector: z.string().optional(),
  signal: z.string().optional(),
  minScore: z.coerce.number().min(0).max(100).optional().default(0),
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
  const country = searchParams.get("country");
  const sector = searchParams.get("sector");
  const status = searchParams.get("status") || "A_QUALIFIER";

  const where: any = {};
  if (country && country !== "ALL") where.country = { contains: country, mode: "insensitive" };
  if (sector && sector !== "ALL") where.sector = { contains: sector, mode: "insensitive" };
  if (status && status !== "ALL") where.status = status;

  const prospects = await prisma.techProspect.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ ok: true, data: prospects });
}

const addSourcedCompanySchema = z.object({
  companyName: z.string().min(1, "Raison sociale requise").max(180),
  country: z.string().min(1, "Pays requis").max(80),
  city: z.string().max(100).optional().nullable(),
  sector: z.string().min(1, "Secteur requis").max(120),
  website: z.string().max(255).optional().nullable(),
  siren: z.string().max(20).optional().nullable(),
  siret: z.string().max(20).optional().nullable(),
  signals: z.array(z.string()).default([]),
  detectionSource: z.string().default("Veille publique & Registres"),
  sourceUrl: z.string().url().optional().nullable().or(z.literal("")),
  potentialTechNeed: z.string().max(1000).optional().nullable(),
  estimatedBudget: z.number().nonnegative().optional().nullable(),
});

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
    const parsed = addSourcedCompanySchema.parse(body);

    // Calcul du score de qualification
    const qualification = calculateQualificationScore(
      parsed.signals as CommercialSignal[],
      {
        sector: parsed.sector,
        country: parsed.country,
        website: parsed.website,
      }
    );

    const prospect = await prisma.techProspect.create({
      data: {
        companyName: parsed.companyName,
        country: parsed.country,
        city: parsed.city || null,
        sector: parsed.sector,
        website: parsed.website || null,
        siren: parsed.siren || null,
        siret: parsed.siret || null,
        status: "A_QUALIFIER",
        priority: qualification.qualificationLevel === "PRIORITAIRE" ? "HAUTE" : "MOYENNE",
        estimatedBudget: parsed.estimatedBudget || null,
        detectionSignals: {
          signals: parsed.signals,
          qualificationScore: qualification.score,
          qualificationLevel: qualification.qualificationLevel,
          criteria: qualification.criteriaDetails,
          source: parsed.detectionSource,
          sourceUrl: parsed.sourceUrl || null,
          potentialTechNeed: parsed.potentialTechNeed || null,
          collectedAt: new Date().toISOString(),
        } as any,
        notes: `[Sourcing] Détecté via ${parsed.detectionSource}. Score: ${qualification.score}/100 (${qualification.qualificationLevel}).\nRecommandations: ${qualification.recommendations.join(" ")}`,
        createdByUserId: session.user.id,
      },
    });

    return NextResponse.json({ ok: true, data: prospect, qualification }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: err.issues?.[0]?.message || "Validation invalide" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: err.message || "Erreur serveur" }, { status: 500 });
  }
}
