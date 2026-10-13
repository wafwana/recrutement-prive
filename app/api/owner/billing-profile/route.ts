import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  legalName: z.string().max(200).optional(),
  accountHolder: z.string().max(200).optional(),
  address: z.string().max(300).optional(),
  postalCode: z.string().max(20).optional(),
  city: z.string().max(120).optional(),
  country: z.string().length(2).default("FR"),
  iban: z.string().max(80).optional(),
  bic: z.string().max(40).optional(),
  bankName: z.string().max(160).optional(),
  invoiceEmail: z.string().email().max(254).optional().or(z.literal("")),
  paymentInstructions: z.string().max(2000).optional(),
  currency: z.string().length(3).default("EUR"),
});

async function owner() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") return null;
  return session;
}

export async function GET() {
  if (!(await owner())) return NextResponse.json({ error: "Accès réservé à l'OWNER." }, { status: 403 });
  const profile = await prisma.ownerBillingProfile.findFirst();
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  if (!(await owner())) return NextResponse.json({ error: "Accès réservé à l'OWNER." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données de facturation invalides." }, { status: 400 });
  const existing = await prisma.ownerBillingProfile.findFirst();
  const profile = existing
    ? await prisma.ownerBillingProfile.update({ where: { id: existing.id }, data: parsed.data })
    : await prisma.ownerBillingProfile.create({ data: parsed.data });
  return NextResponse.json({ profile });
}
