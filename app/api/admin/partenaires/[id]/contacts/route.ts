import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { addPartnerContact, deletePartnerContact } from "@/lib/partenaires/partner-service";

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
    if (!body.name) {
      return NextResponse.json({ error: "Le nom du contact est obligatoire." }, { status: 400 });
    }

    const contact = await addPartnerContact(
      partnerId,
      {
        name: body.name,
        roleTitle: body.roleTitle,
        email: body.email,
        phone: body.phone,
        source: body.source,
        notes: body.notes,
      },
      { userId: user.id, name: user.name, role: user.role }
    );

    return NextResponse.json({ contact }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePartnerAccess();
  if (!user) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  const { id: partnerId } = await params;
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");

  if (!contactId) {
    return NextResponse.json({ error: "Paramètre contactId requis." }, { status: 400 });
  }

  try {
    const res = await deletePartnerContact(partnerId, contactId, {
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
