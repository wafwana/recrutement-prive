import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { compareSalaryPriority, parseSalary } from "@/lib/offers/salary";

const ALLOWED_STATUS = ["DETECTED", "A_QUALIFIER", "QUALIFIED", "MATCHING", "CONTACTED", "FILLED", "ARCHIVED", "REJECTED"] as const;
type AllowedStatus = (typeof ALLOWED_STATUS)[number];

async function requireAccess() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : null;
  const role = typeof session?.user?.role === "string" ? session.user.role : null;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) return null;
  if (!(await hasPermission(userId, role, "OFFRES_VIVIER"))) return null;
  return { userId, role };
}

export async function GET(request: Request) {
  const actor = await requireAccess();
  if (!actor) return NextResponse.json({ error: "Permission OFFRES_VIVIER non accordée par l’Owner." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() || "";
  const status = searchParams.get("status")?.trim() || "";
  const country = searchParams.get("country")?.trim().toLowerCase() || "";

  const offers = await prisma.externalJobOpportunity.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 5000,
    select: {
      id: true, externalId: true, source: true, sourceUrl: true, title: true,
      companyName: true, country: true, city: true, categoryCode: true,
      subCategoryCode: true, skills: true, experienceYears: true, language: true,
      salary: true, publishedAt: true, closingAt: true, description: true,
      status: true, createdAt: true, updatedAt: true,
    },
  });

  const filtered = offers.filter((offer) => {
    if (status && offer.status !== status) return false;
    if (country && !(offer.country || "").toLowerCase().includes(country)) return false;
    if (!q) return true;
    return [offer.title, offer.companyName, offer.country, offer.city, offer.categoryCode, offer.subCategoryCode, offer.description]
      .some((value) => String(value || "").toLowerCase().includes(q));
  });

  // Strict business priority: disclosed salary first, highest annualized value first,
  // then publication date. Offers without a readable salary are always below them.
  filtered.sort((a, b) => {
    const salaryOrder = compareSalaryPriority(a.salary, b.salary);
    if (salaryOrder !== 0) return salaryOrder;
    const ad = a.publishedAt?.getTime() ?? a.createdAt.getTime();
    const bd = b.publishedAt?.getTime() ?? b.createdAt.getTime();
    return bd - ad;
  });

  return NextResponse.json({
    offers: filtered.map((offer) => ({ ...offer, salaryPriority: parseSalary(offer.salary) })),
    total: filtered.length,
    priorityRule: "SALAIRE_ANNUALISE_DECROISSANT_THEN_PUBLICATION",
  });
}

export async function POST(request: Request) {
  const actor = await requireAccess();
  if (!actor) return NextResponse.json({ error: "Permission OFFRES_VIVIER non accordée par l’Owner." }, { status: 403 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Le titre de l’offre est obligatoire." }, { status: 400 });

  const externalId = "manual-" + crypto.randomUUID();
  const offer = await prisma.externalJobOpportunity.create({
    data: {
      externalId,
      source: "MANUAL_RP",
      title,
      companyName: typeof body.companyName === "string" ? body.companyName.trim() || null : null,
      country: typeof body.country === "string" ? body.country.trim() || null : null,
      city: typeof body.city === "string" ? body.city.trim() || null : null,
      categoryCode: typeof body.categoryCode === "string" ? body.categoryCode.trim() || null : null,
      subCategoryCode: typeof body.subCategoryCode === "string" ? body.subCategoryCode.trim() || null : null,
      salary: typeof body.salary === "string" ? body.salary.trim() || null : null,
      sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl.trim() || null : null,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      status: "A_QUALIFIER",
    },
    select: { id: true, title: true, status: true },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: actor.userId,
      actorRole: actor.role || "UNKNOWN",
      action: "CREATE_OFFER_POOL_ENTRY",
      targetType: "EXTERNAL_JOB_OPPORTUNITY",
      targetId: offer.id,
      details: { source: "MANUAL_RP" },
    },
  });

  return NextResponse.json({ offer }, { status: 201 });
}

export async function PATCH(request: Request) {
  const actor = await requireAccess();
  if (!actor) return NextResponse.json({ error: "Permission OFFRES_VIVIER non accordée par l’Owner." }, { status: 403 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!id || !ALLOWED_STATUS.includes(status as AllowedStatus)) {
    return NextResponse.json({ error: "Offre ou statut invalide." }, { status: 400 });
  }

  const offer = await prisma.externalJobOpportunity.update({
    where: { id },
    data: { status },
    select: { id: true, status: true, title: true },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: actor.userId,
      actorRole: actor.role || "UNKNOWN",
      action: "UPDATE_OFFER_POOL_STATUS",
      targetType: "EXTERNAL_JOB_OPPORTUNITY",
      targetId: id,
      details: { status },
    },
  });

  return NextResponse.json({ offer });
}
