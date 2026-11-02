import { NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit } from "@/lib/security/rate-limit";
import { validateContactFields } from "@/lib/contact/validation";

const CONTACT_TO = "recrutement.prive@hotmail.com";
const CONTACT_FROM = "contact@recrutement-prive.com";
const CONTACT_LIMIT = 5;
const CONTACT_WINDOW_MS = 10 * 60_000;
const MAX_BODY_BYTES = 32 * 1024;

export async function POST(request: Request) {
  // Limitation de fréquence locale en mémoire (sliding window par instance Vercel serverless).
  // Sert de premier rempart anti-flood sans imposer de dépendance payante ou de migration base de données.
  const clientIp =
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const limit = rateLimit(`public-contact:${clientIp}`, CONTACT_LIMIT, CONTACT_WINDOW_MS);

  if (!limit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { ok: false, error: "Trop de messages envoyés. Réessayez dans quelques instants." },
      { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
    );
  }

  // Vérification de la taille du corps de requête :
  // 1. Contrôle précoce via Content-Length si présent
  const rawContentLength = request.headers.get("content-length");
  if (rawContentLength !== null) {
    const contentLength = Number(rawContentLength);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Le message est trop volumineux." }, { status: 413 });
    }
  }

  // 2. Contrôle de la taille réelle des octets reçus (couvre chunked transfer ou absence d'en-tête Content-Length)
  let rawBytes: ArrayBuffer;
  try {
    rawBytes = await request.clone().arrayBuffer();
    if (rawBytes.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Le message est trop volumineux." }, { status: 413 });
    }
  } catch {
    // Si la lecture brute échoue, on continue vers request.formData() qui gérera l'erreur
  }

  let body: FormData;
  try {
    body = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Format de formulaire invalide." }, { status: 400 });
  }

  const validation = validateContactFields({
    name: String(body.get("name") ?? ""),
    email: String(body.get("email") ?? ""),
    phone: String(body.get("phone") ?? ""),
    subject: String(body.get("subject") ?? ""),
    message: String(body.get("message") ?? ""),
  });

  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const { name, email, phone, subject, message } = validation.data;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("[contact] email delivery is not configured");
    return NextResponse.json(
      { ok: false, error: "Le service de contact est temporairement indisponible." },
      { status: 503 },
    );
  }

  try {
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
    console.error("[contact] email delivery failed", error);
    return NextResponse.json(
      { ok: false, error: "Impossible d'envoyer le message pour le moment." },
      { status: 502 },
    );
  }
}
