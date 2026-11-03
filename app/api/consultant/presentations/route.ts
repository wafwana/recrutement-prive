import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { z } from "zod";
import { createMissionPresentation } from "@/lib/mission-lock";

const bodySchema = z.object({
  missionId: z.string().min(1),
  applicationId: z.string().min(1),
  candidateId: z.string().min(1),
  companyId: z.string().min(1),
});

export async function POST(request: Request) {
  let session = getActiveSessionContext();
  if (!session) {
    try {
      session = await auth();
    } catch {
      // Fail closed outside a valid authenticated request context.
    }
  }

  // Candidate presentation is an OWNER decision. ADMIN/CONSULTANT permissions
  // must not delegate this decision through the legacy consultant endpoint.
  if (!session?.user?.id || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Seul l'OWNER peut présenter un candidat." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données de présentation invalides" }, { status: 400 });
  }

  try {
    const presentation = await createMissionPresentation({
      ...parsed.data,
      actorUserId: session.user.id,
    });
    return NextResponse.json(
      {
        id: presentation.id,
        state: presentation.state,
        financialConditionStatus: presentation.financialConditionStatus,
        presentedAt: presentation.presentedAt,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Présentation refusée" },
      { status: 409 },
    );
  }
}
