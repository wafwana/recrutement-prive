import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { createPartnerAgreement, getPartnerDetails } from "@/lib/partenaires/partner-service";

async function requirePartnerAccess() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  const name = typeof session?.user?.name === "string" ? session.user.name : session?.user?.email || "Utilisateur";
  if (!session?.user || !userId || !role === "ADMIN") return null;
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

  return NextResponse.json({ agreements: partner.agreements });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePartnerAccess();
  if (!user) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  const { id: partnerId } = await params;

  try {
    const body = await request.json();
    if (!body.title || !body.agreementType) {
      return NextResponse.json({ error: "Champs obligatoires : title, agreementType." }, { status: 400 });
    }

    const agreement = await createPartnerAgreement(
      partnerId,
      body,
      { userId: user.id, name: user.name, role: user.role }
    );

    return NextResponse.json({ agreement }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
