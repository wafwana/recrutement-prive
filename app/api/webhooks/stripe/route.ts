import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "node:crypto";

function verifySignature(payload: string, signature: string, secret: string) {
  const parts = Object.fromEntries(signature.split(",").map(part => part.split("=") as [string, string]));
  const timestamp = Number(parts.t);
  const received = parts.v1;
  if (!timestamp || !received || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const signed = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");
  return received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook non configuré", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  if (!signature || !verifySignature(payload, signature, secret)) return new Response("Signature invalide", { status: 400 });
  let event: { type?: string; data?: { object?: { metadata?: { meetingId?: string }; id?: string; payment_status?: string } } };
  try { event = JSON.parse(payload); } catch { return new Response("JSON invalide", { status: 400 }); }
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type || "")) return new Response("ok");
  const object = event.data?.object;
  const meetingId = object?.metadata?.meetingId;
  if (!meetingId) return new Response("ok");
  if (event.type === "checkout.session.completed" && object?.payment_status !== "paid") return new Response("ok");
  await prisma.contactMeeting.updateMany({
    where: { id: meetingId, paymentStatus: { not: "PAID" } },
    data: { paymentStatus: "PAID", paidAt: new Date(), paymentReference: object?.id ?? undefined },
  });
  return new Response("ok");
}
