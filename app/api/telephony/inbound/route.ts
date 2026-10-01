import { NextResponse } from "next/server";
import { telephonyEngine } from "@/lib/telephony/engine";
import { z } from "zod";

const inboundSchema = z.object({
  callerNumber: z.string().min(3),
  ivrChoice: z.union([z.string(), z.number()]).optional(),
  callSid: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = inboundSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Format d'appel entrant invalide.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await telephonyEngine.processInboundCall(parsed.data);

    return NextResponse.json({
      ok: true,
      callLogId: result.callLogId,
      caller: result.caller,
      selectedCategory: result.selectedCategory,
      announcementText: result.announcementText,
      routing: {
        action: result.action,
        primaryPhone: result.primaryPhone,
        secondaryPhone: result.secondaryPhone,
        ringMode: result.ringMode,
        transferDelaySeconds: result.transferDelaySeconds,
        isOffHours: result.isOffHours,
      },
    });
  } catch (err) {
    console.error("[/api/telephony/inbound] Exception:", err);
    return NextResponse.json(
      { error: "Erreur lors du traitement de l'appel entrant." },
      { status: 500 }
    );
  }
}
