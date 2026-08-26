import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SETTING_KEY = "recrutement_prive_pricing_catalog";

const defaultCatalog = [
  { id: "cadre-specialise", name: "Cadre / recrutement spécialisé", description: "Recrutement de cadres sur une fonction spécialisée.", pricingType: "PERCENTAGE", price: 19, currency: "EUR", conditions: "Success fee selon mandat", active: true, visibility: "PUBLIC" },
  { id: "expert-rare", name: "Expert rare / métier en tension", description: "Recherche de compétences rares ou de métiers en tension.", pricingType: "PERCENTAGE", price: 21, currency: "EUR", conditions: "Success fee selon mandat", active: true, visibility: "PUBLIC" },
  { id: "cadre-superieur", name: "Cadre supérieur", description: "Recherche ciblée de cadres supérieurs.", pricingType: "PERCENTAGE", price: 22, currency: "EUR", conditions: "Success fee selon mandat", active: true, visibility: "PUBLIC" },
  { id: "international", name: "Profil international", description: "Recrutement impliquant une recherche internationale.", pricingType: "PERCENTAGE", price: 24, currency: "EUR", conditions: "Conditions spécifiques selon pays et mandat", active: true, visibility: "PUBLIC" },
  { id: "c-level", name: "Direction / C-level", description: "Recherche de dirigeants et profils de direction.", pricingType: "PERCENTAGE", price: 27, currency: "EUR", conditions: "Mandat encadré", active: true, visibility: "PUBLIC" },
  { id: "executive-search", name: "Executive Search confidentiel", description: "Chasse confidentielle à forte valeur ajoutée.", pricingType: "PERCENTAGE", price: 30, currency: "EUR", conditions: "Retained / mandat confidentiel", active: true, visibility: "PUBLIC" },
  { id: "mandat-exceptionnel", name: "Mandat exceptionnel très complexe", description: "Mission exceptionnelle nécessitant un dispositif spécifique.", pricingType: "PERCENTAGE", price: 33, currency: "EUR", conditions: "33 % maximum, validation Owner", active: true, visibility: "INTERNAL" },
];

async function requireOwner() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") return null;
  return session.user.id;
}

export async function GET() {
  if (!(await requireOwner())) return NextResponse.json({ error: "Accès réservé à l'Owner" }, { status: 403 });
  const setting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!setting) {
    await prisma.systemSetting.create({ data: { key: SETTING_KEY, value: defaultCatalog } });
    return NextResponse.json({ items: defaultCatalog });
  }
  return NextResponse.json({ items: setting.value });
}

export async function PUT(request: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "Accès réservé à l'Owner" }, { status: 403 });
  const body = await request.json();
  if (!Array.isArray(body?.items)) return NextResponse.json({ error: "Format invalide" }, { status: 400 });

  const items = body.items.map((item: any, index: number) => ({
    id: String(item.id || `prestation-${index + 1}`),
    name: String(item.name || "").trim(),
    description: String(item.description || "").trim(),
    pricingType: String(item.pricingType || "PERCENTAGE"),
    price: Number(item.price || 0),
    currency: String(item.currency || "EUR"),
    conditions: String(item.conditions || "").trim(),
    active: Boolean(item.active),
    visibility: String(item.visibility || "PUBLIC"),
  }));

  if (items.some((item: any) => !item.name || item.price < 0)) return NextResponse.json({ error: "Chaque prestation doit avoir un nom et un prix valide." }, { status: 400 });

  const setting = await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: items },
    update: { value: items },
  });
  return NextResponse.json({ items: setting.value });
}
