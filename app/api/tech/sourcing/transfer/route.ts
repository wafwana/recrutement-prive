import { NextRequest, NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { detectDuplicateProspect } from "@/lib/tech/sourcing";
import { z } from "zod";

const transferProspectSchema = z.object({
  techProspectId: z.string().min(1, "Identifiant requis"),
  targetStatus: z.enum(["QUALIFIE", "CONTACTE", "PROPOSITION"]).default("QUALIFIE"),
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
    const parsed = transferProspectSchema.parse(body);

    const prospect = await prisma.techProspect.findUnique({
      where: { id: parsed.techProspectId },
    });

    if (!prospect) {
      return NextResponse.json({ ok: false, error: "Prospect introuvable" }, { status: 404 });
    }

    // Contrôle anti-doublon face au pipeline déjà existant
    const otherProspects = await prisma.techProspect.findMany({
      where: {
        id: { not: prospect.id },
        status: { in: ["QUALIFIE", "CONTACTE", "PROPOSITION", "SIGNE"] },
      },
      select: { siren: true, siret: true, website: true, country: true },
    });

    const isDuplicate = detectDuplicateProspect(otherProspects, {
      siren: prospect.siren,
      siret: prospect.siret,
      website: prospect.website,
      country: prospect.country,
    });

    if (isDuplicate) {
      return NextResponse.json(
        {
          ok: false,
          error: "Un prospect actif correspondant à ce SIREN/SIRET ou domaine web existe déjà dans le pipeline commercial.",
        },
        { status: 409 }
      );
    }

    // Mise à jour du statut vers le pipeline CRM
    const updated = await prisma.techProspect.update({
      where: { id: prospect.id },
      data: {
        status: parsed.targetStatus,
        notes: prospect.notes
          ? `${prospect.notes}\n[${new Date().toISOString()}] Transféré vers le pipeline commercial (${parsed.targetStatus}) par ${session.user.id}.`
          : `[${new Date().toISOString()}] Transféré vers le pipeline commercial (${parsed.targetStatus}).`,
      },
    });

    // Journalisation d'audit
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        actorRole: role,
        action: "TECH_PROSPECT_TRANSFER_TO_CRM",
        targetType: "TECH_PROSPECT",
        targetId: prospect.id,
        details: { fromStatus: prospect.status, toStatus: parsed.targetStatus },
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: err.issues?.[0]?.message || "Validation invalide" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: err.message || "Erreur serveur" }, { status: 500 });
  }
}
