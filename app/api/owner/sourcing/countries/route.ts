import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

async function requireSourcingOwner() {
  const session = getActiveSessionContext() || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : null;
  const role = typeof session?.user?.role === "string" ? session.user.role : null;
  if (!userId || role !== "OWNER") return null;
  if (!(await hasPermission(userId, role, "SOURCING"))) return null;
  return { userId, role };
}

function parseCountries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter((item) => item.length >= 2 && item.length <= 100))].slice(0, 50);
}

export async function GET() {
  const actor = await requireSourcingOwner();
  if (!actor) return NextResponse.json({ error: "Accès réservé à l’OWNER autorisé." }, { status: 403 });

  const [companies, settings] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, country: true },
      take: 500,
    }),
    prisma.systemSetting.findMany({
      where: { key: { startsWith: "sourcing:countries:" } },
      select: { key: true, value: true, updatedAt: true },
    }),
  ]);
  const byCompany = new Map(settings.map((row) => [
    row.key.slice("sourcing:countries:".length),
    { countries: parseCountries(row.value), updatedAt: row.updatedAt.toISOString() },
  ]));
  return NextResponse.json({
    companies: companies.map((company) => ({
      ...company,
      countries: byCompany.get(company.id)?.countries ?? [],
      updatedAt: byCompany.get(company.id)?.updatedAt ?? null,
    })),
  });
}

const bodySchema = z.object({
  companyId: z.string().trim().min(1).max(191),
  countries: z.array(z.string().trim().min(2).max(100)).max(50),
});

export async function POST(request: Request) {
  const actor = await requireSourcingOwner();
  if (!actor) return NextResponse.json({ error: "Accès réservé à l’OWNER autorisé." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Entreprise ou liste de pays invalide." }, { status: 400 });

  const company = await prisma.company.findUnique({
    where: { id: parsed.data.companyId },
    select: { id: true, name: true },
  });
  if (!company) return NextResponse.json({ error: "Entreprise introuvable." }, { status: 404 });

  const countries = parseCountries(parsed.data.countries);
  if (parsed.data.countries.length > 0 && countries.length === 0) {
    return NextResponse.json({ error: "Aucun pays valide dans la liste." }, { status: 400 });
  }

  await prisma.systemSetting.upsert({
    where: { key: `sourcing:countries:${company.id}` },
    create: { key: `sourcing:countries:${company.id}`, value: countries },
    update: { value: countries, updatedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: "UPDATE_ENTERPRISE_SOURCING_COUNTRIES",
      targetType: "Company",
      targetId: company.id,
      details: { companyName: company.name, countriesCount: countries.length, countries },
    },
  });
  return NextResponse.json({ ok: true, companyId: company.id, countries });
}
