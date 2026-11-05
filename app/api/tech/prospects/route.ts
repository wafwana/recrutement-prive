import { NextRequest, NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { z } from "zod";

const createProspectSchema = z.object({
  companyName: z.string().min(1, "La raison sociale est requise").max(180),
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
  ]).optional().default("NOUVEAU"),
  priority: z.enum(["BASSE", "MOYENNE", "HAUTE", "URGENTE"]).optional().default("MOYENNE"),
  estimatedBudget: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  assignedToUserId: z.string().optional().nullable(),
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
  const priority = searchParams.get("priority");
  const sector = searchParams.get("sector");
  const search = searchParams.get("search");

  const where: any = {};
  if (status && status !== "ALL") where.status = status;
  if (priority && priority !== "ALL") where.priority = priority;
  if (sector && sector !== "ALL") where.sector = sector;
  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { contactEmail: { contains: search, mode: "insensitive" } },
      { siren: { contains: search } },
      { siret: { contains: search } },
    ];
  }

  const prospects = await prisma.techProspect.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      requirements: { select: { id: true, title: true, status: true } },
      projects: { select: { id: true, name: true, status: true } },
    },
    take: 100,
  });

  return NextResponse.json({ ok: true, data: prospects });
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
    const parsed = createProspectSchema.parse(body);

    const prospect = await prisma.techProspect.create({
      data: {
        companyName: parsed.companyName,
        siren: parsed.siren || null,
        siret: parsed.siret || null,
        country: parsed.country || null,
        city: parsed.city || null,
        sector: parsed.sector || null,
        companySize: parsed.companySize || null,
        website: parsed.website || null,
        contactName: parsed.contactName || null,
        contactEmail: parsed.contactEmail || null,
        contactRole: parsed.contactRole || null,
        decisionMakers: parsed.decisionMakers || null,
        detectionSignals: parsed.detectionSignals || null,
        status: parsed.status,
        priority: parsed.priority,
        estimatedBudget: parsed.estimatedBudget || null,
        notes: parsed.notes || null,
        assignedToUserId: parsed.assignedToUserId || null,
        createdByUserId: session.user.id,
      },
    });

    return NextResponse.json({ ok: true, data: prospect }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: err.issues?.[0]?.message || "Validation invalide" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: err.message || "Erreur serveur" }, { status: 500 });
  }
}
