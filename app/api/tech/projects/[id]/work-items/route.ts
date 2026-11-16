import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor, isTechActor } from "@/lib/tech/access";
import { hasPermission } from "@/lib/auth/permissions";

type Context = { params: Promise<{ id: string }> };
type Actor = { userId: string; isOwner: boolean };

async function canAccessProject(projectId: string, actor: Actor) {
  if (actor.isOwner) return true;
  const [project, assignedTask] = await Promise.all([
    prisma.techProject.findUnique({ where: { id: projectId }, select: { projectManagerUserId: true } }),
    prisma.techProjectTask.findFirst({ where: { techProjectId: projectId, assigneeUserId: actor.userId }, select: { id: true } }),
  ]);
  return Boolean(project && (project.projectManagerUserId === actor.userId || assignedTask));
}

export async function GET(_request: Request, context: Context) {
  const actor = await getTechActor();
  if (!isTechActor(actor)) return actor;
  const { id } = await context.params;
  const project = await prisma.techProject.findUnique({ where: { id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  if (!(await canAccessProject(id, actor))) return NextResponse.json({ error: "Accès refusé à ce projet." }, { status: 403 });

  const [tasks, milestones] = await Promise.all([
    prisma.techProjectTask.findMany({ where: { techProjectId: id }, orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }] }),
    prisma.techProjectMilestone.findMany({ where: { techProjectId: id }, orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }] }),
  ]);
  return NextResponse.json({ tasks, milestones });
}

export async function POST(request: Request, context: Context) {
  const actor = await getTechActor();
  if (!isTechActor(actor)) return actor;
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || !["TASK", "MILESTONE"].includes(body.kind) || typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 180) {
    return NextResponse.json({ error: "Type et intitulé valides requis." }, { status: 400 });
  }

  const project = await prisma.techProject.findUnique({ where: { id }, select: { id: true, projectManagerUserId: true } });
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  if (!actor.isOwner && project.projectManagerUserId !== actor.userId) {
    return NextResponse.json({ error: "Seul l'OWNER ou le responsable du projet peut créer une tâche ou un jalon." }, { status: 403 });
  }

  let dueAt: Date | null = null;
  if (body.dueAt !== undefined && body.dueAt !== null && body.dueAt !== "") {
    dueAt = new Date(String(body.dueAt));
    if (Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: "Date d'échéance invalide." }, { status: 400 });
  }

  let assigneeUserId: string | null = null;
  if (body.kind === "TASK" && body.assigneeUserId) {
    if (typeof body.assigneeUserId !== "string") return NextResponse.json({ error: "Affectation invalide." }, { status: 400 });
    const assignee = await prisma.user.findUnique({ where: { id: body.assigneeUserId }, select: { id: true, role: true, status: true } });
    if (!assignee || assignee.status !== "ACTIVE" || !["OWNER", "ADMIN", "CONSULTANT"].includes(assignee.role)) {
      return NextResponse.json({ error: "Collaborateur introuvable ou inactif." }, { status: 400 });
    }
    if (assignee.role !== "OWNER" && !(await hasPermission(assignee.id, assignee.role, "TECH_SOLUTIONS_MANAGE"))) {
      return NextResponse.json({ error: "Le collaborateur ne possède pas la permission Solutions technologiques." }, { status: 400 });
    }
    assigneeUserId = assignee.id;
  }

  const item = await prisma.$transaction(async (tx) => {
    const data = {
      title: body.title.trim(),
      description: typeof body.description === "string" ? body.description.trim().slice(0, 5000) : null,
      dueAt,
      techProjectId: id,
    };
    const created = body.kind === "TASK"
      ? await tx.techProjectTask.create({ data: { ...data, assigneeUserId } })
      : await tx.techProjectMilestone.create({ data });
    await tx.techProjectEvent.create({
      data: { eventType: body.kind === "TASK" ? "TASK_CREATED" : "MILESTONE_CREATED", note: created.title, actorUserId: actor.userId, actorRole: actor.role, techProjectId: id },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.userId,
        actorRole: actor.role,
        action: body.kind === "TASK" ? "TECH_PROJECT_TASK_CREATED" : "TECH_PROJECT_MILESTONE_CREATED",
        targetType: body.kind === "TASK" ? "TECH_PROJECT_TASK" : "TECH_PROJECT_MILESTONE",
        targetId: created.id,
        details: { projectId: id, dueAt: dueAt?.toISOString() ?? null, assigneeUserId },
      },
    });
    return created;
  });
  return NextResponse.json({ item }, { status: 201 });
}
