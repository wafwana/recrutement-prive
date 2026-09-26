import OpenAI from "openai";
import { sendEmail } from "@/lib/email/service";

export type ExternalOfferOutreach = {
  recipientEmail: string | null;
  subject: string;
  html: string;
  text: string;
  source: "EXTERNAL_OFFER";
};

function collectEmails(value: unknown, found = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    for (const match of value.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi)) found.add(match[0].toLowerCase());
  } else if (Array.isArray(value)) {
    for (const item of value) collectEmails(item, found);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) collectEmails(item, found);
  }
  return found;
}

export function extractOfferContactEmail(rawData: unknown): string | null {
  const emails = [...collectEmails(rawData)];
  return emails.find((email) => !/^(noreply|no-reply|donotreply|do-not-reply)@/i.test(email)) ?? null;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function fallbackMessage(input: {
  title: string;
  country?: string | null;
  city?: string | null;
  skills: string[];
}) {
  const location = [input.city, input.country].filter(Boolean).join(", ");
  const skillText = input.skills.slice(0, 3).join(", ");
  const subject = `Recrutement Privé — ${input.title}`;
  const text = [
    "Bonjour,",
    "",
    `Nous avons identifié votre recherche de ${input.title}${location ? ` à ${location}` : ""}.`,
    "",
    `Après lecture de l'offre, nous avons retenu notamment ${skillText || "les compétences associées à ce poste"} comme éléments importants du besoin.`,
    "",
    "Recrutement Privé peut se positionner sur cette recherche de profil difficile, sous réserve de validation précise du besoin. Nous ne vous annonçons pas de candidat avant d'avoir vérifié l'adéquation réelle.",
    "",
    "Si ce recrutement est toujours d'actualité, nous pouvons échanger rapidement.",
    "",
    "Cordialement,",
    "Recrutement Privé",
  ].join("\n");
  return { subject, text };
}

export async function generateExternalOfferOutreach(input: {
  companyName?: string | null;
  title: string;
  country?: string | null;
  city?: string | null;
  skills: string[];
  experienceYears?: number | null;
  language?: string | null;
  summary: string;
  recipientEmail?: string | null;
  sourceUrl?: string | null;
}): Promise<ExternalOfferOutreach> {
  const recipientEmail = input.recipientEmail ?? null;
  let subject = `Recrutement Privé — ${input.title}`;
  let text = "";

  if (process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_JOB_MODEL || "gpt-4.1-mini",
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: `Rédige un premier courrier B2B très court à partir de cette offre d'emploi publique.
Montre que Recrutement Privé a compris le besoin de l'entreprise.
Mentionne brièvement 1 à 3 compétences réellement présentes dans l'offre et explique pourquoi elles comptent pour le poste.
Indique que Recrutement Privé peut se positionner sur cette recherche de profil difficile, sans promettre de candidat ni de résultat.
N'invente aucune information. Maximum 140 mots.
Entreprise: ${input.companyName || "non précisée"}
Poste: ${input.title}
Lieu: ${[input.city, input.country].filter(Boolean).join(", ") || "non précisé"}
Compétences: ${input.skills.join(", ") || "non précisées"}
Expérience: ${input.experienceYears ?? "non précisée"}
Langue: ${input.language || "non précisée"}
Résumé: ${input.summary}
URL source: ${input.sourceUrl || "non précisée"}`,
        }],
      }],
      text: {
        format: {
          type: "json_schema",
          name: "external_offer_outreach",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: { subject: { type: "string" }, text: { type: "string" } },
            required: ["subject", "text"],
          },
        },
      },
    });
    if (response.output_text) {
      const parsed = JSON.parse(response.output_text) as { subject?: string; text?: string };
      subject = parsed.subject?.trim() || subject;
      text = parsed.text?.trim() || "";
    }
  }

  if (!text) text = fallbackMessage(input).text;

  return {
    recipientEmail,
    subject,
    text,
    html: text.split("\n").map((line) => line ? `<p>${escapeHtml(line)}</p>` : "").join(""),
    source: "EXTERNAL_OFFER",
  };
}

export async function sendExternalOfferOutreach(input: ExternalOfferOutreach) {
  if (!input.recipientEmail) return { ok: false, error: "Aucune adresse email exploitable dans la source de l'offre." };
  return sendEmail({ to: input.recipientEmail, subject: input.subject, html: input.html });
}
