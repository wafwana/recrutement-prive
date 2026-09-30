import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { processOfferBatch } from "@/lib/jobs/offer-pipeline";

async function requireAccess() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : null;
  const role = typeof session?.user?.role === "string" ? session.user.role : null;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) return null;
  if (!(await hasPermission(userId, role || undefined, "OFFRES_VIVIER"))) return null;
  return { userId, role };
}

export async function POST(request: Request) {
  const actor = await requireAccess();
  if (!actor) {
    return NextResponse.json({ error: "Permission OFFRES_VIVIER non accordée par l'Owner." }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {}

  const limit = typeof body.limit === "number" && Number.isFinite(body.limit) ? Math.min(200, Math.max(1, body.limit)) : 100;
  const statusFilter = Array.isArray(body.statusFilter)
    ? body.statusFilter.filter((v): v is string => typeof v === "string")
    : ["DETECTED", "A_QUALIFIER"];

  const batchSummary = await processOfferBatch({ limit, statusFilter });

  await prisma.auditLog.create({
    data: {
      actorUserId: actor.userId,
      actorRole: actor.role || "UNKNOWN",
      action: "BATCH_QUALIFY_AND_MATCH_OFFERS",
      targetType: "EXTERNAL_JOB_OPPORTUNITY",
      details: {
        limit,
        statusFilter,
        totalProcessed: batchSummary.totalProcessed,
        qualified: batchSummary.qualified,
        rejected: batchSummary.rejected,
        matched: batchSummary.matched,
        errors: batchSummary.errors,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    batchSummary,
  });
}
