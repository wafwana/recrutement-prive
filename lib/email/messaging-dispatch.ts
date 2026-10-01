import { sendEmail } from "./service";
import { getAppBaseUrl } from "@/lib/url";
import { prisma } from "@/lib/prisma";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export interface DispatchMessageEmailParams {
  conversationId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  bodyText?: string;
}

/**
 * Dispatches minimal email notifications to conversation participants when a new message is posted.
 * Enforces idempotency via SystemSetting tracking and omits raw sensitive message body text.
 */
export async function dispatchMessageNotificationEmail(
  params: DispatchMessageEmailParams
): Promise<{ dispatchedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let dispatchedCount = 0;

  if (!process.env.DATABASE_URL) {
    return { dispatchedCount: 0, errors: ["Base de données non disponible."] };
  }

  const idempotencyKey = `msg_email:${params.messageId}`;

  try {
    // Idempotency check: verify whether notification email was already dispatched for this message
    const existingKey = await prisma.systemSetting.findUnique({
      where: { key: idempotencyKey },
    });

    if (existingKey) {
      return { dispatchedCount: 0, errors: [] }; // Already sent, idempotent exit
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return { dispatchedCount: 0, errors: ["Conversation introuvable."] };
    }

    const recipientParticipants = conversation.participants.filter(
      (p) => p.userId !== params.senderId
    );

    const baseUrl = getAppBaseUrl();
    const messageUrl = `${baseUrl}/espace/messages?conversationId=${encodeURIComponent(params.conversationId)}`;
    const safeSubject = escapeHtml(conversation.subject || "Nouveau message Recrutement Privé");
    const safeSenderName = escapeHtml(params.senderName || "Un membre Recrutement Privé");

    for (const participant of recipientParticipants) {
      const recipientUser = participant.user;
      if (!recipientUser?.email) continue;

      const safeRecipientName = escapeHtml(recipientUser.name || "Bonjour");

      // Minimal non-sensitive email body without exposing candidate/company PII or raw text
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0b1b2b; font-size: 18px; border-bottom: 2px solid #c7a15a; padding-bottom: 10px;">
            Recrutement Privé · Notification de Message
          </h2>
          <p style="font-size: 14px; line-height: 1.6;">Bonjour ${safeRecipientName},</p>
          <p style="font-size: 14px; line-height: 1.6;">
            Vous avez reçu un nouveau message de <strong>${safeSenderName}</strong> (${escapeHtml(params.senderRole)}) dans votre fil de discussion : <em>${safeSubject}</em>.
          </p>
          <div style="background-color: #f8fafc; border-left: 4px solid #c7a15a; padding: 15px; margin: 20px 0; font-size: 13px; color: #555;">
            Afin de garantir la confidentialité et la sécurité des échanges, le contenu du message est accessible uniquement sur la plateforme.
          </div>
          <div style="margin-top: 25px;">
            <a href="${messageUrl}" style="background-color: #0b1b2b; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">
              Consulter le message sur Recrutement Privé →
            </a>
          </div>
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 11px; color: #888;">
            Recrutement Privé — Plateforme sécurisée (<a href="mailto:contact@recrutement-prive.com" style="color: #0b1b2b;">contact@recrutement-prive.com</a>)
          </div>
        </div>
      `;

      const sendResult = await sendEmail({
        to: recipientUser.email,
        subject: `[Recrutement Privé] Nouveau message : ${conversation.subject || "Message reçu"}`,
        html: htmlBody,
      });

      if (sendResult.ok) {
        dispatchedCount++;
      } else {
        errors.push(`Échec d'envoi à ${recipientUser.email}: ${sendResult.error}`);
      }
    }

    // Persist idempotency key after dispatch attempt
    await prisma.systemSetting.create({
      data: {
        key: idempotencyKey,
        value: { messageId: params.messageId, dispatchedAt: new Date().toISOString(), dispatchedCount },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[dispatchMessageNotificationEmail] Exception:", msg);
    errors.push(msg);
  }

  return { dispatchedCount, errors };
}
