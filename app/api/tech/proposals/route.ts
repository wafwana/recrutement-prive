import { NextRequest, NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { z } from "zod";

const createProposalSchema = z.object({
  techProspectId: z.string().min(1, "Le prospect est requis"),
  title: z.string().min(1, "Le titre est requis").max(180),
  setupPrice: z.number().nonnegative("Le prix initial doit être positif"),
  monthlySubscriptionPrice: z.number().nonnegative().optional().default(0),
  currency: z.enum(["EUR", "USD", "GBP", "XOF"]).default("EUR"),
  validUntil: z.string().optional().nullable(),
  terms: z.string().max(5000).optional().nullable(),
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
    const parsed = createProposalSchema.parse(body);

    const prospect = await prisma.techProspect.findUnique({
      where: { id: parsed.techProspectId },
    });
    if (!prospect) {
      return NextResponse.json({ ok: false, error: "Prospect introuvable" }, { status: 404 });
    }

    // Mise à jour de l'état commercial du prospect vers PROPOSITION
    await prisma.techProspect.update({
      where: { id: prospect.id },
      data: {
        status: "PROPOSITION",
        estimatedBudget: parsed.setupPrice,
        notes: prospect.notes
          ? `${prospect.notes}\n[${new Date().toISOString()}] Proposition préparée: ${parsed.title} (${parsed.setupPrice} ${parsed.currency} + ${parsed.monthlySubscriptionPrice} ${parsed.currency}/mois)`
          : `[${new Date().toISOString()}] Proposition préparée: ${parsed.title} (${parsed.setupPrice} ${parsed.currency} + ${parsed.monthlySubscriptionPrice} ${parsed.currency}/mois)`,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Proposition commerciale enregistrée",
      data: {
        prospectId: prospect.id,
        title: parsed.title,
        setupPrice: parsed.setupPrice,
        monthlySubscriptionPrice: parsed.monthlySubscriptionPrice,
        currency: parsed.currency,
        status: "PROPOSITION",
      },
    }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: err.issues?.[0]?.message || "Validation invalide" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: err.message || "Erreur serveur" }, { status: 500 });
  }
}
