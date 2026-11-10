import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor, isTechActor } from "@/lib/tech/access";
type Ctx = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Ctx) {
  const actor = await getTechActor(); if (!isTechActor(actor)) return actor;
  const { id } = await context.params;
  const prospect = await prisma.techProspect.findUnique({ where: { id }, include: { events: { orderBy: { createdAt: "desc" }, take: 100 }, requirements: { orderBy: { createdAt: "desc" } }, proposals: { orderBy: { createdAt: "desc" } }, projects: { orderBy: { createdAt: "desc" } }, _count: { select: { requirements: true, proposals: true, projects: true } } } });
  if (!prospect) return NextResponse.json({ error: "Prospect introuvable." }, { status: 404 });
  return NextResponse.json({ prospect });
}
export async function PATCH(request: Request, context: Ctx) {
  const actor = await getTechActor(); if (!isTechActor(actor)) return actor;
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const allowed = ["companyName","sector","country","region","city","contactName","contactEmail","contactRole","leadSource","projectNeed","projectSize","projectMaturity","urgency","nextAction","nextActionAt","priority","estimatedBudget","notes"] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) data[key] = body[key] === "" ? null : body[key];
  if ("companyName" in data && (typeof data.companyName !== "string" || !data.companyName.trim())) return NextResponse.json({ error: "Nom d'entreprise invalide." }, { status: 400 });
  if ("nextActionAt" in data && data.nextActionAt) { const date = new Date(String(data.nextActionAt)); if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Date invalide." }, { status: 400 }); data.nextActionAt = date; }
  if ("estimatedBudget" in data && data.estimatedBudget !== null) { const amount = Number(data.estimatedBudget); if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: "Budget invalide." }, { status: 400 }); data.estimatedBudget = amount; }
  if ("priority" in data && !["BASSE","MOYENNE","HAUTE","URGENTE"].includes(String(data.priority))) return NextResponse.json({ error: "Priorité invalide." }, { status: 400 });
  if ("status" in body) {
    if (typeof body.status !== "string" || !["NOUVEAU","A_QUALIFIER","QUALIFIE","CONTACTE","CDC_RECU","CHIFFRAGE","PROPOSITION","SIGNE","ABANDONNE"].includes(body.status)) return NextResponse.json({ error: "Étape inconnue." }, { status: 400 });
    data.status = body.status;
  }
  const before = await prisma.techProspect.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Prospect introuvable." }, { status: 404 });
  const after = await prisma.$transaction(async tx => {
    const updated = await tx.techProspect.update({ where: { id }, data });
    const changed = Object.keys(data);
    for (const field of changed) {
      const oldValue = (before as Record<string, unknown>)[field];
      const newValue = (updated as Record<string, unknown>)[field];
      if (String(oldValue ?? "") !== String(newValue ?? "")) await tx.techProspectEvent.create({ data: { eventType: field === "status" ? "STATUS_CHANGED" : "FIELD_UPDATED", fromValue: oldValue instanceof Date ? oldValue.toISOString() : String(oldValue ?? ""), toValue: newValue instanceof Date ? newValue.toISOString() : String(newValue ?? ""), note: field, actorUserId: actor.userId, actorRole: actor.role, techProspectId: id } });
    }
    await tx.auditLog.create({ data: { actorUserId: actor.userId, actorRole: actor.role, action: "TECH_PROSPECT_UPDATED", targetType: "TECH_PROSPECT", targetId: id, details: { fields: changed } } });
    return updated;
  });
  return NextResponse.json({ prospect: after });
}
