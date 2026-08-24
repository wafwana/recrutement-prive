import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getClientAddress, rateLimit } from "@/lib/security/rate-limit";

const CONTACT_TO = "recrutement.prive@hotmail.com";
const CONTACT_FROM = "contact@recrutement-prive.com";
const MAX_FIELD_LENGTH = 4_000;

function getRequired(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  const address = getClientAddress(request);
  const limit = rateLimit(`contact:${address}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Trop de demandes. Merci de réessayer plus tard." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const body = await request.formData();
    const name = getRequired(body.get("name"));
    const email = getRequired(body.get("email"));
    const phone = getRequired(body.get("phone"));
    const subject = getRequired(body.get("subject"));
    const message = getRequired(body.get("message"));

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ ok: false, error: "Champs requis manquants." }, { status: 400 });
    }
    if ([name, email, phone, subject, message].some((value) => value.length > MAX_FIELD_LENGTH)) {
      return NextResponse.json({ ok: false, error: "Un ou plusieurs champs sont trop longs." }, { status: 400 });
    }

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!validEmail) {
      return NextResponse.json({ ok: false, error: "Adresse email invalide." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[contact] email delivery is not configured");
      return NextResponse.json(
        { ok: false, error: "Le service de contact est temporairement indisponible." },
        { status: 503 },
      );
    }

    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: CONTACT_FROM,
      to: CONTACT_TO,
      replyTo: email,
      subject: `[Recrutement Privé] ${subject}`,
      text: [
        `Nom : ${name}`,
        `Email : ${email}`,
        `Téléphone : ${phone || "Non renseigné"}`,
        `Objet : ${subject}`,
        "",
        message,
      ].join("\n"),
    });

    if (result.error) {
      console.error("[contact] email provider error", result.error);
      return NextResponse.json(
        { ok: false, error: "Impossible d'envoyer le message pour le moment." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[contact] unexpected error", error);
    return NextResponse.json(
      { ok: false, error: "Impossible de traiter le message." },
      { status: 500 },
    );
  }
}
