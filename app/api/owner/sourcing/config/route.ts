import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { z } from "zod";

const configSchema = z.object({
  sources: z.array(z.string().trim().url("Chaque source doit être une URL valide (https://)")).default([]),
});

async function requireOwnerOrSourcingAccess() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : null;
  const role = typeof session?.user?.role === "string" ? session.user.role : null;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) return null;
  if (!(await hasPermission(userId, role || undefined, "SOURCING"))) return null;
  return { userId, role };
}

export async function GET() {
  const actor = await requireOwnerOrSourcingAccess();
  if (!actor) return NextResponse.json({ error: "Non autorisé." }, { status: 403 });

  const record = await prisma.systemSetting.findUnique({
    where: { key: "sourcing:candidate_sources" },
    select: { value: true, updatedAt: true },
  });

  const dbSources = Array.isArray(record?.value)
    ? record.value.filter((v): v is string => typeof v === "string" && /^https:\/\//i.test(v))
    : [];

  return NextResponse.json({ sources: dbSources, updatedAt: record?.updatedAt ?? null });
}

export async function POST(request: Request) {
  const actor = await requireOwnerOrSourcingAccess();
  if (!actor) return NextResponse.json({ error: "Non autorisé." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "URLs de sources invalides." }, { status: 400 });
  }

  const validSources = parsed.data.sources.filter((s) => /^https:\/\//i.test(s));

  await prisma.systemSetting.upsert({
    where: { key: "sourcing:candidate_sources" },
    create: {
      key: "sourcing:candidate_sources",
      value: validSources,
    },
    update: {
      value: validSources,
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: actor.userId,
      actorRole: actor.role || "STAFF",
      action: "UPDATE_CANDIDATE_SOURCING_CONFIG",
      targetType: "SYSTEM_SETTING",
      details: { sourcesCount: validSources.length, sources: validSources },
    },
  });

  return NextResponse.json({ ok: true, sources: validSources });
}
