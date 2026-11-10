import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TECH_PIPELINE, getTechActor, isTechActor } from "@/lib/tech/access";

const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
const nullable = (v: unknown) => text(v) || null;
export async function GET(request: Request) {
  const actor = await getTechActor(); if (!isTechActor(actor)) return actor;
  const q = new URL(request.url).searchParams.get("q")?.trim() || "";
  const [saved, prospects] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "tech_pipeline_stages" }, select: { value: true } }),
    prisma.techProspect.findMany({
      where: q ? { OR: [{ companyName: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }, { country: { contains: q, mode: "insensitive" } }, { sector: { contains: q, mode: "insensitive" } }, { contactName: { contains: q, mode: "insensitive" } }, { contactEmail: { contains: q, mode: "insensitive" } }] } : undefined,
      orderBy: [{ updatedAt: "desc" }], take: 200,
      include: { _count: { select: { requirements: true, proposals: true, projects: true } } },
    }),
  ]);
  const stages = Array.isArray(saved?.value) ? saved.value : DEFAULT_TECH_PIPELINE;
  return NextResponse.json({ prospects, stages });
}
export async function POST(request: Request) {
  const actor = await getTechActor(); if (!isTechActor(actor)) return actor;
  const body = await request.json().catch(() => null);
  if (!body || !text(body.companyName)) return NextResponse.json({ error: "Le nom de l'entreprise est obligatoire." }, { status: 400 });
  const data = {
    companyName: text(body.companyName), sector: nullable(body.sector), country: nullable(body.country),
    region: nullable(body.region), city: nullable(body.city), contactName: nullable(body.contactName),
    contactEmail: nullable(body.contactEmail), contactRole: nullable(body.contactRole), leadSource: nullable(body.leadSource),
    projectNeed: nullable(body.projectNeed), projectSize: nullable(body.projectSize), projectMaturity: nullable(body.projectMaturity),
    urgency: nullable(body.urgency), nextAction: nullable(body.nextAction),
    nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : null,
    priority: ["BASSE","MOYENNE","HAUTE","URGENTE"].includes(body.priority) ? body.priority : "MOYENNE",
    estimatedBudget: Number.isFinite(Number(body.estimatedBudget)) && body.estimatedBudget !== "" ? Number(body.estimatedBudget) : null,
    notes: nullable(body.notes), createdByUserId: actor.userId,
  };
  if (data.nextActionAt && Number.isNaN(data.nextActionAt.getTime())) return NextResponse.json({ error: "Date de prochaine action invalide." }, { status: 400 });
  const prospect = await prisma.$transaction(async tx => {
    const created = await tx.techProspect.create({ data });
    await tx.techProspectEvent.create({ data: { eventType: "PROSPECT_CREATED", note: "Création du prospect", actorUserId: actor.userId, actorRole: actor.role, techProspectId: created.id } });
    await tx.auditLog.create({ data: { actorUserId: actor.userId, actorRole: actor.role, action: "TECH_PROSPECT_CREATED", targetType: "TECH_PROSPECT", targetId: created.id, details: { companyName: created.companyName } } });
    return created;
  });
  return NextResponse.json({ prospect }, { status: 201 });
}
