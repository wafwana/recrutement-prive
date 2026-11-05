import { NextRequest, NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { z } from "zod";

const updateProspectSchema = z.object({
  companyName: z.string().min(1).max(180).optional(),
  siren: z.string().max(20).optional().nullable(),
  siret: z.string().max(20).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  sector: z.string().max(120).optional().nullable(),
  companySize: z.string().max(50).optional().nullable(),
  website: z.string().max(255).optional().nullable(),
  contactName: z.string().max(120).optional().nullable(),
  contactEmail: z.string().email("Email invalide").max(180).optional().nullable().or(z.literal("")),
  contactRole: z.string().max(100).optional().nullable(),
  decisionMakers: z.any().optional().nullable(),
  detectionSignals: z.any().optional().nullable(),
  status: z.enum([
    "NOUVEAU",
    "A_QUALIFIER",
    "QUALIFIE",
    "CONTACTE",
    "CDC_RECU",
    "CHIFFRAGE",
    "PROPOSITION",
    "SIGNE",
    "ABANDONNE",
  ]).optional(),
  priority: z.enum(["BASSE", "MOYENNE", "HAUTE", "URGENTE"]).optional(),
  estimatedBudget: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  assignedToUserId: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const prospect = await prisma.techProspect.findUnique({
    where: { id },
    include: {
      requirements: { orderBy: { createdAt: "desc" } },
      projects: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!prospect) {
    return NextResponse.json({ ok: false, error: "Prospect introuvable" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: prospect });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateProspectSchema.parse(body);

    const updated = await prisma.techProspect.update({
      where: { id },
      data: parsed,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: err.issues?.[0]?.message || "Validation invalide" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: err.message || "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
  }

  // Seul l'OWNER peut supprimer définitivement un prospect
  if (session.user.role !== "OWNER") {
    return NextResponse.json({ ok: false, error: "Action réservée à l'OWNER" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const prospect = await prisma.techProspect.findUnique({
      where: { id },
      include: {
        _count: {
          select: { requirements: true, projects: true },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ ok: false, error: "Prospect introuvable" }, { status: 404 });
    }

    if (prospect._count.requirements > 0 || prospect._count.projects > 0) {
      return NextResponse.json(
        { ok: false, error: "Impossible de supprimer un prospect ayant des cahiers des charges ou des projets liés. Archivez-le plutôt." },
        { status: 400 }
      );
    }

    await prisma.techProspect.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true, message: "Prospect supprimé avec succès" });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Erreur serveur" }, { status: 500 });
  }
}
