import { NextResponse } from "next/server";
import { lookupCompanyBySiret, normalizeSiret } from "@/lib/company/public-registry";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siret = normalizeSiret(url.searchParams.get("siret") ?? "");
  if (!/^\d{14}$/.test(siret)) {
    return NextResponse.json({ error: "SIRET invalide. Saisissez 14 chiffres." }, { status: 400 });
  }

  try {
    const company = await lookupCompanyBySiret(siret);
    if (!company) return NextResponse.json({ error: "Aucun établissement correspondant à ce SIRET n'a été trouvé." }, { status: 404 });
    return NextResponse.json(company, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de récupérer les informations publiques de l'entreprise." },
      { status: 502 },
    );
  }
}
