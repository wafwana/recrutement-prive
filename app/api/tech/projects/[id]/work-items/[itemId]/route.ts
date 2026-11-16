import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor, isTechActor } from "@/lib/tech/access";

type Context = { params: Promise<{ id: string; itemId: string }> };
const TASK_STATES = ["A_FAIRE", "EN_COURS", "TERMINE", "BLOQUE"];
const MILESTONE_STATES = ["A_FAIRE", "EN_COURS", "TERMINE"];

export async function PATCH(request: Request, context: Context) {
  const actor = await getTechActor();
  if (!isTechActor(actor)) return actor;
  const { id, itemId } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || !["TASK", "MILESTONE"].includes(body.kind)) {
    return NextResponse.json({ error: "Type d'élément invalide." }, { status: 400 });
  }

  const isTask = body.kind === "TASK";
  const current = isTask
    ? await prisma.techProjectTask.findFirst({ where: { id: itemId, techProjectId: id } })
    : await prisma.techProjectMilestone.findFirst({ where: { id: itemId, techProjectId: id } });
  if (!current) return NextResponse.json({ error: "Tâche ou jalon introuvable pour ce projet." }, { status: 404 });

  const project = await prisma.techProject.findUnique({ where: { id }, select: { projectManagerUserId: true } });
  const isProjectManager = project?.projectManagerUserId === actor.userId;
  const isAssignee = isTask && "assigneeUserId" in current && current.assigneeUserId === actor.userId;
  if (!actor.isOwner && !isProjectManager && !isAssignee) {
    return NextResponse.json({ error: "Vous ne pouvez pas modifier cet élément." }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if ("status" in body) {
    const allowed = isTask ? TASK_STATES : MILESTONE_STATES;
    if (typeof body.status !== "string" || !allowed.includes(body.status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }
    data.status = body.status;
    data.completedAt = body.status === "TERMINE" ? new Date() : null;
  }
  if ("dueAt" in body) {
    if (!actor.isOwner && !isProjectManager) {
      return NextResponse.json({ error: "Seul le responsable peut modifier l'échéance." }, { status: 403 });
    }
    if (body.dueAt === null || body.dueAt === "") data.dueAt = null;
    else {
      const dueAt = new Date(String(body.dueAt));
      if (Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: "Date d'échéance invalide." }, { status: 400 });
      data.dueAt = dueAt;
    }
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: "Aucune modification valide." }, { status: 400 });

  const updated = await prisma.$transaction(async (tx) => {
    const item = isTask
      ? await tx.techProjectTask.update({ where: { id: itemId }, data })
      : await tx.techProjectMilestone.update({ where: { id: itemId }, data });
    await tx.techProjectEvent.create({
      data: {
        eventType: isTask ? "TASK_UPDATED" : "MILESTONE_UPDATED",
        fromValue: "status" in body ? current.status : null,
        toValue: "status" in body ? String(body.status) : null,
        note: Object.keys(data).join(","),
        actorUserId: actor.userId,
        actorRole: actor.role,
        techProjectId: id,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.userId,
        actorRole: actor.role,
        action: isTask ? "TECH_PROJECT_TASK_UPDATED" : "TECH_PROJECT_MILESTONE_UPDATED",
        targetType: isTask ? "TECH_PROJECT_TASK" : "TECH_PROJECT_MILESTONE",
        targetId: itemId,
        details: { projectId: id, fields: Object.keys(data) },
      },
    });
    return item;
  });
  return NextResponse.json({ item: updated });
}
