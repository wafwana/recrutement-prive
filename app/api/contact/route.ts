import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.formData();
    const name = String(body.get("name") ?? "").trim();
    const email = String(body.get("email") ?? "").trim();
    const phone = String(body.get("phone") ?? "").trim();
    const subject = String(body.get("subject") ?? "").trim();
    const message = String(body.get("message") ?? "").trim();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ ok: false, error: "Champs requis manquants." }, { status: 400 });
    }

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!validEmail) {
      return NextResponse.json({ ok: false, error: "Adresse email invalide." }, { status: 400 });
    }

    console.info("[contact] message received", { name, email, phone, subject, messageLength: message.length });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Impossible de traiter le message." }, { status: 400 });
  }
}
