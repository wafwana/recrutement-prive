import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CONTACT_TO = "recrutement.prive@hotmail.com";
const CONTACT_FROM = "contact@recrutement-prive.com";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const candidateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(40).optional(),
  location: z.string().trim().max(120).optional(),
  headline: z.string().trim().max(160).optional(),
  consent: z.literal("yes"),
});

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const parsed = candidateSchema.safeParse({
      name: text(form.get("name")),
      email: text(form.get("email")),
      phone: text(form.get("phone")) || undefined,
      location: text(form.get("location")) || undefined,
      headline: text(form.get("headline")) || undefined,
      consent: text(form.get("consent")),
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Veuillez vérifier les informations saisies." }, { status: 400 });
    }

    const file = form.get("cv");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, error: "Veuillez joindre votre CV." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "Le CV ne doit pas dépasser 10 Mo." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ ok: false, error: "Format de CV non accepté. Utilisez PDF, DOC ou DOCX." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[candidate-cv] email delivery is not configured");
      return NextResponse.json({ ok: false, error: "Le service de candidature est temporairement indisponible." }, { status: 503 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existingUser && existingUser.role !== "CANDIDAT") {
      return NextResponse.json({ ok: false, error: "Cette adresse email est déjà rattachée à un autre espace." }, { status: 409 });
    }

    const user = existingUser ?? await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: "CANDIDAT",
      },
    });

    const profile = await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        headline: parsed.data.headline || undefined,
        location: parsed.data.location || undefined,
        phone: parsed.data.phone || undefined,
      },
      update: {
        headline: parsed.data.headline || undefined,
        location: parsed.data.location || undefined,
        phone: parsed.data.phone || undefined,
      },
    });

    const resend = new Resend(apiKey);
    const attachmentContent = Buffer.from(await file.arrayBuffer()).toString("base64");
    const attachment = {
      filename: file.name,
      content: attachmentContent,
      contentType: file.type || undefined,
    };

    const cabinetEmail = await resend.emails.send({
      from: CONTACT_FROM,
      to: CONTACT_TO,
      replyTo: parsed.data.email,
      subject: `[Recrutement Privé] Nouveau CV – ${parsed.data.name}`,
      text: [
        "Nouveau candidat enregistré sur la plateforme.",
        "",
        `Nom : ${parsed.data.name}`,
        `Email : ${parsed.data.email}`,
        `Téléphone : ${parsed.data.phone || "Non renseigné"}`,
        `Localisation : ${parsed.data.location || "Non renseignée"}`,
        `Profil : ${parsed.data.headline || "Non renseigné"}`,
        `Candidate ID : ${profile.id}`,
        "",
        "Le CV est joint à cet email.",
      ].join("\n"),
      attachments: [attachment],
    });

    if (cabinetEmail.error) {
      console.error("[candidate-cv] cabinet email error", cabinetEmail.error);
      return NextResponse.json({ ok: false, error: "Le candidat a été enregistré, mais l'envoi du CV au cabinet a échoué. Merci de réessayer." }, { status: 502 });
    }

    const confirmation = await resend.emails.send({
      from: CONTACT_FROM,
      to: parsed.data.email,
      subject: "Recrutement Privé – Confirmation de réception de votre CV",
      text: [
        `Bonjour ${parsed.data.name},`,
        "",
        "Nous confirmons la bonne réception de votre CV par Recrutement Privé.",
        "Votre profil a bien été enregistré dans notre base candidats.",
        "",
        "Notre équipe pourra revenir vers vous si une opportunité correspond à votre parcours.",
        "",
        "Cordialement,",
        "Recrutement Privé",
        "contact@recrutement-prive.com",
        "+33 6 26 90 92 31",
        "Saint-Amand-les-Eaux",
      ].join("\n"),
    });

    if (confirmation.error) {
      console.error("[candidate-cv] confirmation email error", confirmation.error);
    }

    return NextResponse.json({
      ok: true,
      message: "Votre CV a bien été reçu et votre profil a été enregistré. Un email de confirmation vous a été envoyé.",
    });
  } catch (error) {
    console.error("[candidate-cv] unexpected error", error);
    return NextResponse.json({ ok: false, error: "Impossible de traiter votre candidature pour le moment." }, { status: 500 });
  }
}
