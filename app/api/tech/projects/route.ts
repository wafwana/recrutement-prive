import { NextRequest, NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { z } from "zod";

const createProjectSchema = z.object({
  techProspectId: z.string().min(1, "Le prospect est requis"),
  name: z.string().min(1, "Le nom du projet est requis").max(180),
  description: z.string().max(5000).optional().nullable(),
  setupPrice: z.number().nonnegative().optional().nullable(),
  monthlySubscriptionPrice: z.number().nonnegative().optional().nullable(),
  currency: z.enum(["EUR", "USD", "GBP", "XOF"]).default("EUR"),
  status: z.enum(["CADRAGE", "DEVELOPPEMENT", "RECETTE", "LIVRE", "MAINTENANCE", "CLOTURE"]).default("CADRAGE"),
  startDate: z.string().optional().nullable(),
  estimatedDeliveryDate: z.string().optional().nullable(),
  repositoryUrl: z.string().url("URL de dépôt invalide").optional().nullable().or(z.literal("")),
  projectManagerUserId: z.string().optional().nullable(),
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
  const status = searchParams.get("status");
  const techProspectId = searchParams.get("techProspectId");

  const where: any = {};
  if (status && status !== "ALL") where.status = status;
  if (techProspectId) where.techProspectId = techProspectId;

  const projects = await prisma.techProject.findMany({
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

  return NextResponse.json({ ok: true, data: projects });
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
    const parsed = createProjectSchema.parse(body);

    const prospect = await prisma.techProspect.findUnique({
      where: { id: parsed.techProspectId },
    });
    if (!prospect) {
      return NextResponse.json({ ok: false, error: "Prospect introuvable" }, { status: 404 });
    }

    const project = await prisma.techProject.create({
      data: {
        techProspectId: parsed.techProspectId,
        name: parsed.name,
        description: parsed.description || null,
        setupPrice: parsed.setupPrice || null,
        monthlySubscriptionPrice: parsed.monthlySubscriptionPrice || null,
        currency: parsed.currency,
        status: parsed.status,
        startDate: parsed.startDate ? new Date(parsed.startDate) : new Date(),
        estimatedDeliveryDate: parsed.estimatedDeliveryDate ? new Date(parsed.estimatedDeliveryDate) : null,
        repositoryUrl: parsed.repositoryUrl || null,
        projectManagerUserId: parsed.projectManagerUserId || session.user.id,
      },
    });

    // Mettre à jour le prospect vers SIGNE s'il ne l'était pas
    if (prospect.status !== "SIGNE") {
      await prisma.techProspect.update({
        where: { id: prospect.id },
        data: { status: "SIGNE" },
      });
    }

    return NextResponse.json({ ok: true, data: project }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: err.issues?.[0]?.message || "Validation invalide" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: err.message || "Erreur serveur" }, { status: 500 });
  }
}
