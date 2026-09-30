import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { discoverInstitutionalPartners, importDiscoveredPartner, DiscoveredPartner } from "@/lib/partenaires/sourcing";

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

export async function GET(request: Request) {
  const user = await requirePartnerAccess();
  if (!user) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  const discovered = await discoverInstitutionalPartners({
    q: searchParams.get("q") || undefined,
    category: searchParams.get("category") || undefined,
    country: searchParams.get("country") || undefined,
  });

  return NextResponse.json({ items: discovered, count: discovered.length });
}

export async function POST(request: Request) {
  const user = await requirePartnerAccess();
  if (!user) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  try {
    const body: { partner: DiscoveredPartner; initialStatus?: string } = await request.json();
    if (!body.partner || !body.partner.officialName || !body.partner.category) {
      return NextResponse.json({ error: "Données de l'organisme découvertes incomplètes." }, { status: 400 });
    }

    const created = await importDiscoveredPartner(
      body.partner,
      { userId: user.id, name: user.name, role: user.role },
      (body.initialStatus as any) || "IDENTIFIED"
    );

    return NextResponse.json({ partner: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur lors de l'import du partenaire.";
    if (msg.startsWith("EXCLUSION_RECRUITMENT_PLATFORM")) {
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
