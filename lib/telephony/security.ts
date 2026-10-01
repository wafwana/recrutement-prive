import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifies HMAC-SHA256 signature for incoming telephony webhooks.
 */
export function verifyTelephonyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret?: string
): { valid: boolean; reason?: string } {
  const webhookSecret = secret || process.env.TELEPHONY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production") {
      return { valid: false, reason: "Clé secrète de webhook non configurée sur le serveur." };
    }
    // Dev/Test mode without secret configured
    return { valid: true };
  }

  if (!signatureHeader) {
    return { valid: false, reason: "En-tête de signature x-rp-signature manquant." };
  }

  try {
    const computedSignature = createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(computedSignature, "utf-8");
    const providedBuffer = Buffer.from(signatureHeader.replace(/^sha256=/, ""), "utf-8");

    if (expectedBuffer.length !== providedBuffer.length) {
      return { valid: false, reason: "Longueur de signature invalide." };
    }

    if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
      return { valid: false, reason: "Signature HMAC invalide." };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: "Erreur lors du calcul de la signature." };
  }
}
