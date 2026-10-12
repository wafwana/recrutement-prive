import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { ensureTaxonomySynced } from "@/lib/taxonomy/sync";
import { hasPermission } from "@/lib/auth/permissions";
import { processCvIntakeAnalysis } from "@/lib/cv/intake-service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
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

  const { id } = await context.params;
  await ensureTaxonomySynced();

  const result = await processCvIntakeAnalysis(id, userId, userRole);
  if (!result) {
    return NextResponse.json({ error: "CV introuvable." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, document: result });
}
