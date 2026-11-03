import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { MAILING_TEMPLATES, type MailingCategory } from "@/lib/mailings/mailings-data";

export async function GET(request: Request) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  const userRole = session?.user?.role || "";

  if (!session?.user || !["OWNER", "ADMIN", "CONSULTANT"].includes(userRole)) {
    return NextResponse.json({ error: "Accès refusé. Réservé aux collaborateurs et à l'Owner." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rawCategory = searchParams.get("category");
  const allowedCategories: MailingCategory[] = ["ENTREPRISES", "SPONSORS", "COLLABORATEURS", "PARTENAIRES"];
  if (rawCategory && !allowedCategories.includes(rawCategory as MailingCategory)) {
    return NextResponse.json({ error: "Catégorie de mailing invalide." }, { status: 400 });
  }
  const category = rawCategory as MailingCategory | null;
  const rawQuery = (searchParams.get("q") || "").trim();
  if (rawQuery.length > 100) return NextResponse.json({ error: "Recherche limitée à 100 caractères." }, { status: 400 });
  const q = rawQuery.toLowerCase();

  let templates = MAILING_TEMPLATES;

  if (category) {
    templates = templates.filter((t) => t.category === category);
  }

  if (q) {
    templates = templates.filter((t) => {
      const inName = t.name.toLowerCase().includes(q);
      const inCode = t.code.toLowerCase().includes(q);
      const inSubject = t.subject.toLowerCase().includes(q);
      const inBody = t.body.toLowerCase().includes(q);
      return inName || inCode || inSubject || inBody;
    });
  }

  return NextResponse.json({
    ok: true,
    total: templates.length,
    templates,
  });
}
