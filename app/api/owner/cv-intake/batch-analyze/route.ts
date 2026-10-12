import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureTaxonomySynced } from "@/lib/taxonomy/sync";
import { hasPermission } from "@/lib/auth/permissions";
import { processCvIntakeAnalysis } from "@/lib/cv/intake-service";

export async function POST(request: Request) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const userRole = session?.user?.role || "";
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(userRole)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (!(await hasPermission(userId, userRole, "CV_INTAKE"))) {
    return NextResponse.json({ error: "Permission d’import/analyse CV non accordée." }, { status: 403 });
  }

  await ensureTaxonomySynced();

  let limit = 10;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.limit === "number" && body.limit > 0 && body.limit <= 50) {
      limit = body.limit;
    }
  } catch {
    // default limit
  }

  const pendingDocs = await prisma.cvIntake.findMany({
    where: { status: "A_ANALYSER" },
    select: { id: true, name: true },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  const results: Array<{ id: string; name: string; success: boolean }> = [];

  for (const doc of pendingDocs) {
    try {
      const res = await processCvIntakeAnalysis(doc.id, userId, userRole);
      results.push({ id: doc.id, name: doc.name, success: Boolean(res) });
    } catch (err) {
      console.error(`[batch analyze error] ${doc.id}:`, err);
      results.push({ id: doc.id, name: doc.name, success: false });
    }
  }

  const processedCount = results.filter((r) => r.success).length;

  return NextResponse.json({
    ok: true,
    totalPending: pendingDocs.length,
    processedCount,
    results,
  });
}
