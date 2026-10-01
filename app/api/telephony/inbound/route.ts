import { NextResponse } from "next/server";
import { telephonyEngine } from "@/lib/telephony/engine";
import { verifyTelephonyWebhookSignature } from "@/lib/telephony/security";
import { z } from "zod";

const inboundSchema = z.object({
  callerNumber: z.string().min(3),
  ivrChoice: z.union([z.string(), z.number()]).optional(),
  callSid: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-rp-signature") || request.headers.get("x-telephony-signature");

    const verification = verifyTelephonyWebhookSignature(rawBody, signatureHeader);
    if (!verification.valid) {
      return NextResponse.json(
        { error: "Signature de webhook invalide ou non autorisée.", reason: verification.reason },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
    }

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
      mode: result.mode,
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
