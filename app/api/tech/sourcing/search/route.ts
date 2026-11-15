import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor, isTechActor } from "@/lib/tech/access";

type OSMResult = {
  place_id: number; osm_type: string; osm_id: number; name?: string;
  display_name?: string; class?: string; type?: string;
  address?: Record<string, string>; extratags?: Record<string, string>;
  namedetails?: Record<string, string>;
};

const text = (value: unknown, max = 160) => typeof value === "string" ? value.trim().slice(0, max) : "";
const pick = (...values: Array<string | undefined>) => values.find((value) => Boolean(value?.trim())) || null;

export async function GET(request: Request) {
  const actor = await getTechActor();
  if (!isTechActor(actor)) return actor;

  const params = new URL(request.url).searchParams;
  const country = text(params.get("country"), 80);
  const region = text(params.get("region"), 80);
  const city = text(params.get("city"), 80);
  const sector = text(params.get("sector"), 80);
  const query = text(params.get("q"), 100);
  if (!country || (!query && !sector && !city && !region)) {
    return NextResponse.json({ error: "Indiquez un pays et au moins un critère de recherche." }, { status: 400 });
  }

  const terms = [query, sector, city, region, country].filter(Boolean);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("limit", "20");
  url.searchParams.set("q", terms.join(" "));

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Accept-Language": "fr,en",
        "User-Agent": "RecrutementPrive-TechSourcing/1.0 (+https://recrutement-prive.com)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      await prisma.auditLog.create({ data: {
        actorUserId: actor.userId, actorRole: actor.role, action: "TECH_SOURCING_SOURCE_FAILED",
        targetType: "TECH_SOURCING", targetId: "openstreetmap-nominatim",
        details: { source: "OpenStreetMap Nominatim", status: response.status, country, collectedAt: new Date().toISOString() },
      } });
      return NextResponse.json({ error: "La source cartographique est momentanément indisponible.", source: "OpenStreetMap Nominatim" }, { status: 502 });
    }

    const raw = await response.json() as OSMResult[];
    const collectedAt = new Date().toISOString();
    const results = raw.filter((item) => text(item.name || item.namedetails?.name))
      .map((item) => {
        const tags = item.extratags || {}, address = item.address || {};
        const sourceUrl = `https://www.openstreetmap.org/${encodeURIComponent(item.osm_type)}/${item.osm_id}`;
        return {
          sourceId: `${item.osm_type}:${item.osm_id}`,
          companyName: text(item.name || item.namedetails?.name),
          activity: pick(tags.description, tags.industrial, tags.shop, tags.office, item.type),
          country: pick(address.country, country),
          region: pick(address.state, address.region, address.county),
          city: pick(address.city, address.town, address.village, address.municipality),
          address: text(item.display_name, 300) || null,
          website: pick(tags.website, tags["contact:website"]),
          publicPhone: pick(tags.phone, tags["contact:phone"]),
          publicEmail: pick(tags.email, tags["contact:email"]),
          source: "OpenStreetMap",
          sourceUrl,
          collectedAt,
          evidence: [{
            kind: "PUBLIC_OBSERVATION" as const,
            category: "FICHE_ENTREPRISE_PUBLIQUE",
            statement: "Informations présentes dans une fiche OpenStreetMap ; elles doivent être vérifiées avant qualification commerciale.",
            sourceUrl,
            observedAt: collectedAt,
          }],
        };
      });

    await prisma.auditLog.create({ data: {
      actorUserId: actor.userId, actorRole: actor.role, action: "TECH_SOURCING_SEARCHED",
      targetType: "TECH_SOURCING", targetId: "openstreetmap-nominatim",
      details: { source: "OpenStreetMap Nominatim", country, region: region || null, city: city || null, sector: sector || null, query: query || null, resultCount: results.length, collectedAt },
    } });

    return NextResponse.json({
      source: "OpenStreetMap Nominatim",
      attribution: "© OpenStreetMap contributors",
      collectedAt,
      results,
      limitations: ["La présence ou l’absence d’une information dans OpenStreetMap ne prouve pas la réalité complète de la situation de l’entreprise.", "Les besoins technologiques ne sont pas déduits automatiquement de l’absence de coordonnées ou de site web.", "Aucun contact externe n’est déclenché."],
    });
  } catch {
    return NextResponse.json({ error: "La recherche n’a pas abouti. Réessayez plus tard.", source: "OpenStreetMap Nominatim" }, { status: 502 });
  }
}
