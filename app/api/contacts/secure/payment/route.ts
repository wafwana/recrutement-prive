import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSecureContactCheckout, isSecureContactPaymentMethod } from "@/lib/payments/secure-contact";

const schema = z.object({ meetingId: z.string().min(1), method: z.string().min(1) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ENTREPRISE") return NextResponse.json({ error: "Paiement réservé à l'entreprise autorisée." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success || !isSecureContactPaymentMethod(parsed.data.method)) return NextResponse.json({ error: "Mode de paiement invalide." }, { status: 400 });
  try {
    const meeting = await createSecureContactCheckout(parsed.data.meetingId, session.user.id, parsed.data.method);
    return NextResponse.json({ meeting, checkoutUrl: meeting.checkoutUrl ?? null, paymentStatus: meeting.paymentStatus });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Paiement indisponible." }, { status: 409 });
  }
}
