import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { updatePartnerAgreement, deletePartnerAgreement } from "@/lib/partenaires/partner-service";

async function requirePartnerAccess() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  const name = typeof session?.user?.name === "string" ? session.user.name : session?.user?.email || "Utilisateur";
  if (!session?.user || !userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) return null;
  if (!(await hasPermission(userId, role, "PARTNERS_MANAGE"))) return null;
  return { id: userId, role: role!, name };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; accordId: string }> }
) {
  const user = await requirePartnerAccess();
  if (!user) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  const { id: partnerId, accordId } = await params;

  try {
    const body = await request.json();
    const updated = await updatePartnerAgreement(partnerId, accordId, body, {
      userId: user.id,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({ agreement: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; accordId: string }> }
) {
  const user = await requirePartnerAccess();
  if (!user) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  const { id: partnerId, accordId } = await params;

  try {
    const res = await deletePartnerAgreement(partnerId, accordId, {
      userId: user.id,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json(res);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
