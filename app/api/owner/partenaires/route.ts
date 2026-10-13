import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { searchPartners, createPartner } from "@/lib/partenaires/partner-service";

async function requirePartnerAccess() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  const name = typeof session?.user?.name === "string" ? session.user.name : session?.user?.email || "Utilisateur";
  if (!session?.user || !userId || role !== "OWNER") return null;
  if (!(await hasPermission(userId, role, "PARTNERS_MANAGE"))) return null;
  return { id: userId, role: role!, name };
}

export async function GET(request: Request) {
  const user = await requirePartnerAccess();
  if (!user) {
    return NextResponse.json({ error: "Accès non autorisé au module Partenaires & Sources." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  const results = await searchPartners({
    q: searchParams.get("q") || undefined,
    category: searchParams.get("category") || undefined,
    subCategory: searchParams.get("subCategory") || undefined,
    partnerType: searchParams.get("partnerType") || undefined,
    country: searchParams.get("country") || undefined,
    region: searchParams.get("region") || undefined,
    city: searchParams.get("city") || undefined,
    sector: searchParams.get("sector") || undefined,
    profession: searchParams.get("profession") || undefined,
    skill: searchParams.get("skill") || undefined,
    language: searchParams.get("language") || undefined,
    targetAudience: searchParams.get("targetAudience") || undefined,
    collaborationType: searchParams.get("collaborationType") || undefined,
    status: searchParams.get("status") || undefined,
    agreementStatus: searchParams.get("agreementStatus") || undefined,
    priority: searchParams.get("priority") || undefined,
    lastContactBefore: searchParams.get("lastContactBefore") || undefined,
    lastContactAfter: searchParams.get("lastContactAfter") || undefined,
    take: searchParams.get("take") ? parseInt(searchParams.get("take")!, 10) : 100,
    skip: searchParams.get("skip") ? parseInt(searchParams.get("skip")!, 10) : 0,
  });

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const user = await requirePartnerAccess();
  if (!user) {
    return NextResponse.json({ error: "Accès non autorisé au module Partenaires & Sources." }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!body.officialName || !body.category) {
      return NextResponse.json({ error: "Champs obligatoires manquants : officialName, category." }, { status: 400 });
    }

    const partner = await createPartner(body, {
      userId: user.id,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({ partner }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    if (msg.startsWith("EXCLUSION_RECRUITMENT_PLATFORM")) {
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
