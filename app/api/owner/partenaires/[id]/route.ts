import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getPartnerDetails,
  updatePartner,
  updatePartnerStatus,
} from "@/lib/partenaires/partner-service";
import type { PartnerStatusCode } from "@/lib/partenaires/taxonomy";

async function requirePartnerAccess() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  const name = typeof session?.user?.name === "string" ? session.user.name : session?.user?.email || "Utilisateur";
  if (!session?.user || !userId || !role === "OWNER") return null;
  if (!(await hasPermission(userId, role, "PARTNERS_MANAGE"))) return null;
  return { id: userId, role: role!, name };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePartnerAccess();
  if (!user) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  const { id } = await params;
  const partner = await getPartnerDetails(id);
  if (!partner) {
    return NextResponse.json({ error: "Partenaire introuvable." }, { status: 404 });
  }

  return NextResponse.json({ partner });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePartnerAccess();
  if (!user) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    if (body.newStatus) {
      const updated = await updatePartnerStatus(
        id,
        body.newStatus as PartnerStatusCode,
        body.notes,
        { userId: user.id, name: user.name, role: user.role }
      );
      return NextResponse.json({ partner: updated });
    }

    const updated = await updatePartner(id, body, {
      userId: user.id,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({ partner: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur lors de la mise à jour.";
    if (msg.startsWith("FORBIDDEN_ONLY_OWNER")) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg.startsWith("EXCLUSION_RECRUITMENT_PLATFORM")) {
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePartnerAccess();
  if (!user) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const updated = await updatePartnerStatus(id, "ARCHIVED", "Archivage de la fiche par l'utilisateur", {
      userId: user.id,
      name: user.name,
      role: user.role,
    });
    return NextResponse.json({ partner: updated, message: "Partenaire archivé avec succès." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur lors de l'archivage.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
