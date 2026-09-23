import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

const SETTING_KEY = "recrutement_prive_pricing_catalog";

const defaultCatalog = [
  { id: "cadre-specialise", name: "Cadre / recrutement spécialisé", description: "Recrutement de cadres sur une fonction spécialisée.", pricingType: "PERCENTAGE", price: 19, currency: "EUR", conditions: "Success fee selon mandat - Panier ref 21 000 € HT", active: true, visibility: "PUBLIC" },
  { id: "expert-rare", name: "Expert rare / métier en tension", description: "Recherche de compétences rares ou de métiers en tension.", pricingType: "PERCENTAGE", price: 21, currency: "EUR", conditions: "Success fee selon mandat - Panier ref 21 000 € HT", active: true, visibility: "PUBLIC" },
  { id: "cadre-superieur", name: "Cadre supérieur", description: "Recherche ciblée de cadres supérieurs.", pricingType: "PERCENTAGE", price: 22, currency: "EUR", conditions: "Success fee selon mandat", active: true, visibility: "PUBLIC" },
  { id: "international", name: "Profil international", description: "Recrutement impliquant une recherche internationale (Europe/UAE).", pricingType: "PERCENTAGE", price: 24, currency: "EUR", conditions: "Conditions spécifiques selon pays et mandat", active: true, visibility: "PUBLIC" },
  { id: "c-level", name: "Direction / C-level", description: "Recherche de dirigeants et profils de direction.", pricingType: "PERCENTAGE", price: 27, currency: "EUR", conditions: "Mandat encadré / Retained Executive Search", active: true, visibility: "PUBLIC" },
  { id: "executive-search", name: "Executive Search confidentiel", description: "Chasse confidentielle à forte valeur ajoutée.", pricingType: "PERCENTAGE", price: 30, currency: "EUR", conditions: "Retained / chasse confidentielle", active: true, visibility: "PUBLIC" },
  { id: "mandat-exceptionnel", name: "Mandat exceptionnel très complexe", description: "Mission exceptionnelle nécessitant un dispositif spécifique.", pricingType: "PERCENTAGE", price: 33, currency: "EUR", conditions: "33 % maximum, validation Owner requise", active: true, visibility: "INTERNAL" },
];

async function requireOwner() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) return null;
  if (!(await hasPermission(userId, role, "PRICING_MANAGEMENT"))) return null;
  return session.user;
}

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Permission prestations et tarifs non accordée par l’Owner" }, { status: 403 });

  const setting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!setting) {
    await prisma.systemSetting.create({ data: { key: SETTING_KEY, value: defaultCatalog } });
    return NextResponse.json({ items: defaultCatalog });
  }
  return NextResponse.json({ items: setting.value });
}

export async function PUT(request: Request) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Accès réservé à l'Owner" }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

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

  if (items.some((item: any) => !item.name || item.price < 0)) {
    return NextResponse.json({ error: "Chaque prestation doit avoir un nom et un prix valide." }, { status: 400 });
  }

  const setting = await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: items },
    update: { value: items },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: owner.id || "OWNER",
      actorRole: "OWNER",
      action: "UPDATE_PRICING_CATALOG",
      targetType: "SYSTEM_SETTING",
      targetId: SETTING_KEY,
      details: { itemsCount: items.length },
    },
  });

  return NextResponse.json({ items: setting.value });
}
