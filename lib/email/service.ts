import { Resend } from "resend";

export const PUBLIC_CONTACT_EMAIL = "contact@recrutement-prive.com";
export const OWNER_HOTMAIL_EMAIL = "recrutement.prive@hotmail.com";
export const DEFAULT_EMAIL_FROM = "Recrutement Privé <contact@recrutement-prive.com>";

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "mock_key") {
    return null;
  }
  return new Resend(apiKey);
}

export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const client = getResendClient();
  const from = options.from || process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM;
  const replyTo = options.replyTo || PUBLIC_CONTACT_EMAIL;

  if (!client) {
    // In local/test environments without live API key, log operational dispatch gracefully
    console.log(`[EMAIL DISPATCH MOCK] To: ${options.to} | From: ${from} | Reply-To: ${replyTo} | Subject: ${options.subject}`);
    return { ok: true, id: `mock-${Date.now()}` };
  }

  try {
    const result = await client.emails.send({
      from,
      replyTo,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (result.error) {
      console.error("[Resend Email Error]", result.error);
      return { ok: false, error: result.error.message };
    }

    return { ok: true, id: result.data?.id };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Email Dispatch Exception]", errorMessage);
    return { ok: false, error: errorMessage };
  }
}

export async function sendOwnerAlert(subject: string, bodyTextHtml: string) {
  const ownerEmail = process.env.OWNER_EMAIL || OWNER_HOTMAIL_EMAIL;
  return sendEmail({
    to: ownerEmail,
    subject: `[ALERTE OWNER] ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
        <h2 style="color: #0b1b2b; font-size: 20px; border-bottom: 2px solid #c7a15a; padding-bottom: 10px;">Recrutement Privé — Notification Owner</h2>
        <div style="margin-top: 15px; font-size: 14px; line-height: 1.6;">
          ${bodyTextHtml}
        </div>
        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; font-size: 11px; color: #666;">
          Cet email est envoyé à la boîte Owner <strong>${ownerEmail}</strong> par la plateforme Recrutement Privé (Expéditeur officiel : ${PUBLIC_CONTACT_EMAIL}).
        </div>
      </div>
    `,
  });
}

export async function sendDepositConfirmation(
  depositorEmail: string,
  docName: string,
  reference: string,
  dateStr: string,
  timeStr: string
) {
  return sendEmail({
    to: depositorEmail,
    subject: `Confirmation de réception — Document ${docName}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
        <h2 style="color: #0b1b2b; font-size: 18px; border-bottom: 2px solid #c7a15a; padding-bottom: 10px;">Recrutement Privé · Confirmation de transmission</h2>
        <p style="font-size: 14px; line-height: 1.6;">Bonjour,</p>
        <p style="font-size: 14px; line-height: 1.6;">Votre document <strong>${docName}</strong> a bien été transmis à Recrutement Privé le <strong>${dateStr}</strong> à <strong>${timeStr}</strong>.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #c7a15a; padding: 12px; margin: 20px 0; font-size: 13px;">
          <strong>Référence de transmission :</strong> <span style="font-family: monospace;">${reference}</span>
        </div>
        <p style="font-size: 13px; color: #555;">Nous vous remercions de votre confiance.</p>
        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; font-size: 11px; color: #888;">
          Recrutement Privé — Service Client (<a href="mailto:${PUBLIC_CONTACT_EMAIL}" style="color: #0b1b2b;">${PUBLIC_CONTACT_EMAIL}</a>)
        </div>
      </div>
    `,
  });
}
