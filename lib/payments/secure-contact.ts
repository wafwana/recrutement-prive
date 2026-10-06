import { prisma } from "@/lib/prisma";

export const SECURE_CONTACT_CURRENCY = "EUR";
export const SECURE_CONTACT_AMOUNT_CENTS = 9900;
export const SECURE_CONTACT_PAYMENT_METHODS = ["CARD", "SEPA_DEBIT", "BANK_TRANSFER"] as const;

export type SecureContactPaymentMethod = (typeof SECURE_CONTACT_PAYMENT_METHODS)[number];

export function isSecureContactPaymentMethod(value: string): value is SecureContactPaymentMethod {
  return (SECURE_CONTACT_PAYMENT_METHODS as readonly string[]).includes(value);
}

export async function createSecureContactCheckout(meetingId: string, companyUserId: string, method: SecureContactPaymentMethod) {
  const meeting = await prisma.contactMeeting.findUnique({
    where: { id: meetingId },
    include: { presentation: { select: { companyUserId: true, companyId: true, missionId: true } } },
  });
  if (!meeting) throw new Error("Contact introuvable.");
  if (meeting.presentation.companyUserId !== companyUserId) throw new Error("Le paiement doit être initié par l'entreprise autorisée.");
  if (meeting.status !== "CONFIRMED") throw new Error("Le cabinet doit d'abord autoriser ce contact.");
  if (meeting.paymentStatus === "PAID") return meeting;
  if (method === "BANK_TRANSFER") {
    return prisma.contactMeeting.update({
      where: { id: meetingId },
      data: { paymentMethod: method, paymentProvider: "MANUAL_INVOICE", paymentStatus: "AWAITING_TRANSFER", paymentReference: `RP-${meeting.id.slice(-10).toUpperCase()}` },
    });
  }
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Le paiement en ligne n'est pas encore activé. Utilisez le virement bancaire ou contactez le cabinet.");
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${process.env.NEXTAUTH_URL || ""}/espace/entreprise/paiement/succes?meetingId=${meeting.id}`);
  params.set("cancel_url", `${process.env.NEXTAUTH_URL || ""}/espace/entreprise/presentation/${meeting.presentation.missionId}`);
  params.set("line_items[0][price_data][currency]", "eur");
  params.set("line_items[0][price_data][product_data][name]", "Contact sécurisé Recrutement Privé — 30 minutes");
  params.set("line_items[0][price_data][product_data][description]", "Entretien interne sécurisé, 30 minutes, coordonnées protégées.");
  params.set("line_items[0][price_data][unit_amount]", String(SECURE_CONTACT_AMOUNT_CENTS));
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[meetingId]", meeting.id);
  params.set("metadata[companyId]", meeting.presentation.companyId);
  if (method === "SEPA_DEBIT") params.set("payment_method_types[0]", "sepa_debit");
  else params.set("payment_method_types[0]", "card");
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Le prestataire de paiement n'a pas pu créer la session.");
  const checkout = await response.json() as { id?: string; url?: string };
  if (!checkout.id || !checkout.url) throw new Error("Session de paiement invalide.");
  return prisma.contactMeeting.update({
    where: { id: meeting.id },
    data: { paymentMethod: method, paymentProvider: "STRIPE", paymentReference: checkout.id, checkoutUrl: checkout.url },
  });
}
