import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";
import { PHONE_COUNTRIES } from "@/lib/phone-countries";

const KEY = (companyId: string) => `company-job-search:${companyId}`;
const allowedCountries = new Set(PHONE_COUNTRIES.map(([country]) => country));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const access = await requireCompanyAccess(searchParams.get("companyId") || undefined);
  const setting = await prisma.systemSetting.findUnique({ where: { key: KEY(access.companyId) }, select: { value: true } });
  const value = setting?.value;
  const countries = value && typeof value === "object" && !Array.isArray(value) && Array.isArray((value as {countries?: unknown}).countries)
    ? (value as {countries: unknown[]}).countries.filter((v): v is string => typeof v === "string" && allowedCountries.has(v))
    : [];
  return NextResponse.json({ countries });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const access = await requireCompanyAccess(typeof body?.companyId === "string" ? body.companyId : undefined);
  const countries = Array.isArray(body?.countries)
    ? [...new Set(body.countries.filter((v: unknown): v is string => typeof v === "string" && allowedCountries.has(v)))]
    : [];
  if (countries.length === 0) return NextResponse.json({ error: "Sélectionnez au moins un pays." }, { status: 400 });
  await prisma.systemSetting.upsert({
    where: { key: KEY(access.companyId) },
    update: { value: { countries } },
    create: { key: KEY(access.companyId), value: { countries } },
  });
  return NextResponse.json({ countries, saved: true });
}
