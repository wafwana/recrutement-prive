import { NextRequest, NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { z } from "zod";

const updateRequirementSchema = z.object({
  status: z.enum(["DEPOSE", "ANALYSE_EN_COURS", "ANALYSE_TERMINEE", "VALIDE", "REJETE"]).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
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
  const doc = await prisma.techRequirementDoc.findUnique({
    where: { id },
    include: {
      techProspect: true,
    },
  });

  if (!doc) {
    return NextResponse.json({ ok: false, error: "Cahier des charges introuvable" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: doc });
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
    const parsed = updateRequirementSchema.parse(body);

    // Seul l'OWNER peut valider ou rejeter formellement un cahier des charges
    if (parsed.status && (parsed.status === "VALIDE" || parsed.status === "REJETE")) {
      if (session.user.role !== "OWNER") {
        return NextResponse.json(
          { ok: false, error: "Seul l'OWNER peut valider ou rejeter un cahier des charges" },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.techRequirementDoc.update({
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
