import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/service";

const AUTO_OUTREACH_ENABLED = process.env.RP_AUTO_OUTREACH_ENABLED === "true";

export type OutreachAudience = "COMPANY" | "CANDIDATE";

function esc(value: string) {
  return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

export function buildFirstContactEmail(audience: OutreachAudience, name?: string) {
  const greeting = name ? `Bonjour ${esc(name)},` : "Bonjour,";
  if (audience === "COMPANY") {
    return {
      subject: "Recrutement Privé — une nouvelle façon de rencontrer des profils qualifiés",
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;max-width:640px"><p>${greeting}</p><p>Recrutement Privé réunit sourcing, sélection et échanges sécurisés au sein d'une même plateforme.</p><p>Vous pouvez identifier des profils pertinents, organiser des échanges encadrés et conserver les interactions dans la plateforme, sans exposer directement les coordonnées personnelles.</p><p>Nous vous proposons de découvrir votre espace et les modalités de recrutement sécurisé.</p><p><a href="https://www.recrutement-prive.com/">Découvrir Recrutement Privé</a></p><p style="font-size:12px;color:#64748b">Vous ne souhaitez plus recevoir ce type de proposition ? Répondez à cet email avec « désinscription ».</p></div>`,
    };
  }
  return {
    subject: "Recrutement Privé — faites connaître votre profil aux recruteurs",
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;max-width:640px"><p>${greeting}</p><p>Recrutement Privé permet aux candidats de présenter leur parcours dans un environnement professionnel et confidentiel.</p><p>Les échanges avec les entreprises autorisées peuvent rester au sein de la plateforme, par messagerie sécurisée ou visioconférence.</p><p>Vous pouvez découvrir la plateforme et décider librement de rejoindre le vivier correspondant à votre profil.</p><p><a href="https://www.recrutement-prive.com/">Découvrir Recrutement Privé</a></p><p style="font-size:12px;color:#64748b">Vous ne souhaitez plus recevoir ce type de proposition ? Répondez à cet email avec « désinscription ».</p></div>`,
  };
}

export async function queueFirstContact(input: {
  audience: OutreachAudience;
  email: string;
  name?: string;
  companyId?: string;
  candidateUserId?: string;
  source?: string;
  campaignKey?: string;
}) {
  const campaignKey = input.campaignKey || `first-contact-${input.audience.toLowerCase()}`;
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.includes(" ")) throw new Error("Adresse email invalide.");
  const existing = await prisma.outreachContact.findUnique({
    where: { recipientEmail_campaignKey: { recipientEmail: normalizedEmail, campaignKey } },
  });
  if (existing?.optedOutAt || existing?.status === "SENT" || existing?.status === "DELIVERED" || existing?.status === "BOUNCED" || existing?.status === "COMPLAINED") {
    return { queued: false, reason: existing.optedOutAt ? "OPTED_OUT" : "ALREADY_CONTACTED", id: existing.id };
  }
  const message = buildFirstContactEmail(input.audience, input.name);
  const record = existing ? await prisma.outreachContact.update({
    where: { id: existing.id },
    data: { recipientType: input.audience, recipientName: input.name, companyId: input.companyId, candidateUserId: input.candidateUserId, source: input.source, subject: message.subject, bodySnapshot: message.html, status: "QUEUED", lastError: null },
  }) : await prisma.outreachContact.create({
    data: { recipientType: input.audience, recipientEmail: normalizedEmail, recipientName: input.name, companyId: input.companyId, candidateUserId: input.candidateUserId, source: input.source, campaignKey, subject: message.subject, bodySnapshot: message.html, status: "QUEUED" },
  });
  if (!AUTO_OUTREACH_ENABLED) return { queued: true, sent: false, id: record.id, reason: "AUTO_OUTREACH_DISABLED" };
  const result = await sendEmail({ to: normalizedEmail, subject: message.subject, html: message.html });
  if (!result.ok) {
    await prisma.outreachContact.update({ where: { id: record.id }, data: { status: "FAILED", lastError: result.error?.slice(0, 500) } });
    return { queued: true, sent: false, id: record.id, reason: "DELIVERY_FAILED" };
  }
  await prisma.outreachContact.update({ where: { id: record.id }, data: { status: "SENT", providerMessageId: result.id, sentAt: new Date() } });
  return { queued: true, sent: true, id: record.id };
}
