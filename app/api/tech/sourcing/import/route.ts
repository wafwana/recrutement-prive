import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor, isTechActor } from "@/lib/tech/access";
import { findTechProspectDuplicate, scoreTechProspect } from "@/lib/tech/sourcing";

const text = (value: unknown, max = 240) => typeof value === "string" ? value.trim().slice(0, max) : "";
const validSource = (value: string) => {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "www.openstreetmap.org"; }
  catch { return false; }
};

export async function POST(request: Request) {
  const actor = await getTechActor();
  if (!isTechActor(actor)) return actor;
  const body = await request.json().catch(() => null);
  if (!body || !text(body.companyName) || !text(body.country) || !validSource(text(body.sourceUrl))) {
    return NextResponse.json({ error: "Entreprise, pays et provenance OpenStreetMap valide sont obligatoires." }, { status: 400 });
  }

  const candidate = {
    companyName: text(body.companyName), country: text(body.country, 80),
    website: text(body.website, 240) || null, sector: text(body.activity, 120) || null,
    publicContact: text(body.publicEmail, 180) || null,
    observedAt: text(body.collectedAt, 40),
    needs: Array.isArray(body.evidence) ? body.evidence.filter((item: any) => item?.kind === "PUBLIC_OBSERVATION" && item?.sourceUrl === body.sourceUrl) : [],
  };
  const existing = await prisma.techProspect.findMany({
    where: { country: { equals: candidate.country, mode: "insensitive" } },
    select: { id: true, companyName: true, country: true, website: true, contactEmail: true },
    take: 500,
  });
  const duplicate = findTechProspectDuplicate(candidate, existing);
  if (duplicate) return NextResponse.json({ imported: false, duplicate }, { status: 409 });

  const score = scoreTechProspect(candidate);
  const sourceData = {
    source: "OpenStreetMap Nominatim",
    sourceUrl: text(body.sourceUrl, 500),
    sourceId: text(body.sourceId, 100),
    collectedAt: candidate.observedAt || new Date().toISOString(),
    publicAddress: text(body.address, 300) || null,
    publicPhone: text(body.publicPhone, 80) || null,
    publicEmail: candidate.publicContact,
    activity: candidate.sector,
    evidence: candidate.needs,
    score,
    scoreVersion: 1,
    contactPermission: "NOT_GRANTED",
  };

  const created = await prisma.$transaction(async (tx) => {
    const prospect = await tx.techProspect.create({ data: {
      companyName: candidate.companyName,
      country: candidate.country,
      region: text(body.region, 100) || null,
      city: text(body.city, 100) || null,
      sector: candidate.sector,
      website: candidate.website,
      contactEmail: candidate.publicContact,
      leadSource: "INTERNATIONAL_TECH_SOURCING",
      status: "A_QUALIFIER",
      priority: "MOYENNE",
      detectionSignals: sourceData,
      notes: "Prospect issu d’une source publique. Informations à vérifier ; aucun besoin confirmé ni contact externe automatique.",
      createdByUserId: actor.userId,
    } });
    await tx.techProspectEvent.create({ data: {
      eventType: "IMPORTED_FROM_INTERNATIONAL_SOURCING",
      note: "Import manuel depuis OpenStreetMap. Coordonnées publiques conservées avec leur provenance ; aucun contact externe déclenché.",
      actorUserId: actor.userId, actorRole: actor.role, techProspectId: prospect.id,
    } });
    await tx.auditLog.create({ data: {
      actorUserId: actor.userId, actorRole: actor.role, action: "TECH_PROSPECT_IMPORTED_FROM_INTERNATIONAL_SOURCING",
      targetType: "TECH_PROSPECT", targetId: prospect.id,
      details: { sourceId: sourceData.sourceId, sourceUrl: sourceData.sourceUrl, country: candidate.country, score: score.total },
    } });
    return prospect;
  });

  return NextResponse.json({ imported: true, prospectId: created.id, score }, { status: 201 });
}
