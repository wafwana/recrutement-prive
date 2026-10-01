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
  bodyText: string;
}

/**
 * Dispatches email notifications to conversation participants when a new message is posted.
 * Errors in email sending are logged and never throw/fail internal message creation.
 */
export async function dispatchMessageNotificationEmail(
  params: DispatchMessageEmailParams
): Promise<{ dispatchedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let dispatchedCount = 0;

  if (!process.env.DATABASE_URL) {
    return { dispatchedCount: 0, errors: ["Base de données non disponible."] };
  }

  try {
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
    const safeSenderName = escapeHtml(params.senderName || "Un utilisateur");
    const safeExcerpt = escapeHtml(
      params.bodyText.length > 300
        ? params.bodyText.substring(0, 300) + "..."
        : params.bodyText
    );

    for (const participant of recipientParticipants) {
      const recipientUser = participant.user;
      if (!recipientUser?.email) continue;

      const safeRecipientName = escapeHtml(recipientUser.name || "Bonjour");

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0b1b2b; font-size: 18px; border-bottom: 2px solid #c7a15a; padding-bottom: 10px;">
            Recrutement Privé · Nouveau Message
          </h2>
          <p style="font-size: 14px; line-height: 1.6;">Bonjour ${safeRecipientName},</p>
          <p style="font-size: 14px; line-height: 1.6;">
            Vous avez reçu un nouveau message de <strong>${safeSenderName}</strong> (${escapeHtml(params.senderRole)}) concernant : <em>${safeSubject}</em>.
          </p>
          <div style="background-color: #f8fafc; border-left: 4px solid #c7a15a; padding: 15px; margin: 20px 0; font-size: 13px; font-style: italic;">
            "${safeExcerpt}"
          </div>
          <div style="margin-top: 25px;">
            <a href="${messageUrl}" style="background-color: #0b1b2b; color: #ffffff; padding: 10px 20px; text-decoration: none; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
              Accéder à la messagerie sécurisée →
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[dispatchMessageNotificationEmail] Exception:", msg);
    errors.push(msg);
  }

  return { dispatchedCount, errors };
}
