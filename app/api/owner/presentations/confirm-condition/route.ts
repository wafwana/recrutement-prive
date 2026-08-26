import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { confirmMissionFinancialCondition, unlockMissionPresentation } from "@/lib/mission-lock";

const bodySchema = z.object({
  presentationId: z.string().min(1),
  action: z.enum(["CONFIRM", "UNLOCK"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Accès Owner requis" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  try {
    if (parsed.data.action === "CONFIRM") {
      const result = await confirmMissionFinancialCondition(parsed.data.presentationId, session.user.id);
      return NextResponse.json({ ok: true, state: result.state, financialConditionStatus: result.financialConditionStatus });
    }

    const result = await unlockMissionPresentation(parsed.data.presentationId, session.user.id);
    return NextResponse.json({ ok: true, state: result.state, unlockedAt: result.unlockedAt });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Action refusée" }, { status: 409 });
  }
}
