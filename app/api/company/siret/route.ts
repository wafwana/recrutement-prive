import { NextResponse } from "next/server";
import { lookupCompanyBySiren, lookupCompanyBySiret, normalizeSiret } from "@/lib/company/public-registry";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const identifier = normalizeSiret(url.searchParams.get("identifier") ?? url.searchParams.get("siret") ?? "");

  if (!/^\d{9}$/.test(identifier) && !/^\d{14}$/.test(identifier)) {
    return NextResponse.json(
      { error: "Identifiant invalide. Saisissez un SIREN à 9 chiffres ou un SIRET à 14 chiffres." },
      { status: 400 },
    );
  }

  try {
    const company = /^\d{9}$/.test(identifier)
      ? await lookupCompanyBySiren(identifier)
      : await lookupCompanyBySiret(identifier);

    if (!company) {
      return NextResponse.json(
        { error: /^\d{9}$/.test(identifier)
          ? "Aucune entreprise correspondant à ce SIREN n'a été trouvée."
          : "Aucun établissement correspondant à ce SIRET n'a été trouvé." },
        { status: 404 },
      );
    }

    return NextResponse.json(company, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de récupérer les informations publiques de l'entreprise." },
      { status: 502 },
    );
  }
}
