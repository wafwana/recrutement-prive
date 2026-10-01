import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { telephonyEngine } from "@/lib/telephony/engine";
import { canMakeOutboundCalls } from "@/lib/telephony/permissions";
import { z } from "zod";

const outboundSchema = z.object({
  targetPhoneNumber: z.string().min(5),
  linkedEntityId: z.string().optional(),
  linkedEntityType: z.enum(["CANDIDATE", "COMPANY", "PARTNER"]).optional(),
});

export async function POST(request: Request) {
  const active = getActiveSessionContext();
  const session = active || (await auth());

  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId) {
    return NextResponse.json(
      { error: "Non authentifié." },
      { status: 401 }
    );
  }

  // Strict server-side permission check
  const allowed = await canMakeOutboundCalls(userId, role || undefined);
  if (!allowed) {
    return NextResponse.json(
      {
        error: "Accès refusé. Les appels sortants sont réservés à l'OWNER ou aux utilisateurs expressément délégués.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = outboundSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Format de numéro ou paramètres invalides.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await telephonyEngine.initiateOutboundCall(
      {
        initiatorUserId: userId,
        targetPhoneNumber: parsed.data.targetPhoneNumber,
        linkedEntityId: parsed.data.linkedEntityId,
        linkedEntityType: parsed.data.linkedEntityType,
      },
      role || "CONSULTANT"
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      callLogId: result.callLogId,
      callerIdUsed: result.callerIdUsed,
      status: result.status,
    });
  } catch (err) {
    console.error("[/api/telephony/outbound] Exception:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'initialisation de l'appel sortant." },
      { status: 500 }
    );
  }
}
