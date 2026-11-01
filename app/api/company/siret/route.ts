import { NextResponse } from "next/server";
import { lookupCompanyBySiren, lookupCompanyBySiret, normalizeSiret } from "@/lib/company/public-registry";
import { rateLimit } from "@/lib/security/rate-limit";

const LOOKUP_LIMIT = 30;
const LOOKUP_WINDOW_MS = 60_000;

export async function GET(request: Request) {
  // Vercel supplies x-real-ip at the edge. The forwarded header is a fallback
  // for compatible reverse-proxy deployments; never use the searched identifier
  // as a rate-limit key because it is user-controlled.
  const clientIp =
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const limit = rateLimit(`company-siret:${clientIp}`, LOOKUP_LIMIT, LOOKUP_WINDOW_MS);

  if (!limit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Trop de recherches successives. Réessayez dans quelques instants." },
      { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(request.url);
  const identifier = normalizeSiret(url.searchParams.get("identifier") ?? url.searchParams.get("siret") ?? "");

  if (!/^\\d{9}$/.test(identifier) && !/^\\d{14}$/.test(identifier)) {
    return NextResponse.json(
      { error: "Identifiant invalide. Saisissez un SIREN à 9 chiffres ou un SIRET à 14 chiffres." },
      { status: 400 },
    );
  }

  try {
    const company = /^\\d{9}$/.test(identifier)
      ? await lookupCompanyBySiren(identifier)
      : await lookupCompanyBySiret(identifier);

    if (!company) {
      return NextResponse.json(
        { error: /^\\d{9}$/.test(identifier)
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
