import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { sendOwnerAlert } from "@/lib/email/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractEmail(value: string) {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase() ?? null;
}

function toPlainText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  if (!secret || !apiKey) {
    return NextResponse.json({ error: "Webhook email non configuré." }, { status: 503 });
  }

  try {
    const payload = await request.text();
    const resend = new Resend(apiKey);
    const headers = {
      id: request.headers.get("svix-id") ?? "",
      timestamp: request.headers.get("svix-timestamp") ?? "",
      signature: request.headers.get("svix-signature") ?? "",
    };

    const event = resend.webhooks.verify({
      payload,
      headers,
      secret,
    });

    if (event.type !== "email.received") {
      return NextResponse.json({ ok: true });
    }

    const senderEmail = extractEmail(event.data.from);
    if (!senderEmail) return NextResponse.json({ ok: true, ignored: "sender" });

    const { data: receivedEmail, error } = await resend.emails.receiving.get(event.data.email_id);
    if (error || !receivedEmail) {
      console.error("[RESEND INBOUND] Unable to retrieve received email", error);
      return NextResponse.json({ error: "Réception email indisponible." }, { status: 502 });
    }

    const body = (receivedEmail.text || toPlainText(receivedEmail.html) || "").slice(0, 12000);
    const subject = String(event.data.subject || receivedEmail.subject || "").slice(0, 200);
    const providerMessageId = String(event.data.message_id || receivedEmail.message_id || event.data.email_id).slice(0, 500);

    const duplicate = await prisma.outreachContact.findFirst({
      where: { replyProviderMessageId: providerMessageId },
      select: { id: true },
    });
    if (duplicate) return NextResponse.json({ ok: true, duplicate: true });

    const outreach = await prisma.outreachContact.findFirst({
      where: {
        recipientEmail: senderEmail,
        repliedAt: null,
        status: { in: ["QUEUED", "SENT", "DELIVERED"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, recipientType: true, recipientName: true, campaignKey: true, subject: true },
    });

    const optOut = /\b(désinscription|desinscription|unsubscribe|stop)\b/i.test(body);
    if (outreach) {
      await prisma.outreachContact.update({
        where: { id: outreach.id },
        data: {
          repliedAt: new Date(),
          replyFromEmail: senderEmail,
          replySubject: subject,
          replyBody: body || null,
          replyProviderMessageId: providerMessageId,
          replyReceivedAt: new Date(),
          status: optOut ? "OPTED_OUT" : "REPLIED",
          optedOutAt: optOut ? new Date() : undefined,
        },
      });
    }

    const label = outreach
      ? `${outreach.recipientType} · ${outreach.recipientName || senderEmail}`
      : `Email entrant non corrélé · ${senderEmail}`;

    await prisma.ownerNotification.create({
      data: {
        title: optOut ? `Désinscription — ${label}` : `Réponse email — ${label}`,
        message: [
          `Expéditeur : ${senderEmail}`,
          `Objet : ${subject || "(sans objet)"}`,
          outreach ? `Campagne : ${outreach.campaignKey}` : "Aucune campagne RP corrélée.",
          "",
          body || "(contenu vide)",
        ].join("\n").slice(0, 14000),
        senderName: outreach?.recipientName || senderEmail,
        senderRole: outreach?.recipientType || "EXTERNE",
      },
    });

    await sendOwnerAlert(
      optOut ? `Désinscription reçue de ${senderEmail}` : `Réponse reçue de ${senderEmail}`,
      `<p><strong>Expéditeur :</strong> ${senderEmail}</p><p><strong>Objet :</strong> ${subject || "(sans objet)"}</p><p><strong>Statut :</strong> ${outreach ? (optOut ? "désinscription enregistrée" : "réponse corrélée") : "email entrant non corrélé"}</p><pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:13px;background:#f8fafc;padding:12px;border:1px solid #e2e8f0;">${body.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}</pre>`,
    );

    return NextResponse.json({ ok: true, correlated: Boolean(outreach), optedOut: optOut });
  } catch (error) {
    console.error("[RESEND INBOUND] webhook verification/processing failed", error);
    return NextResponse.json({ error: "Webhook invalide." }, { status: 400 });
  }
}
