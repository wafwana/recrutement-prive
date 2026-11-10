import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor, isTechActor } from "@/lib/tech/access";

export async function POST() {
  const actor = await getTechActor();
  if (!isTechActor(actor)) return actor;
  if (!actor.isOwner) {
    return NextResponse.json({ error: "Seul l’OWNER peut lancer l’import des entreprises du Pôle 1." }, { status: 403 });
  }

  // Import only the company identity fields needed for technology prospecting.
  // Recruitment jobs, candidates, applications, contacts and documents are never selected.
  const companies = await prisma.company.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      siren: true,
      siret: true,
      apeCode: true,
      website: true,
      country: true,
      sourceType: true,
      sourceUrl: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const identifiers = companies.flatMap((company) => [
    ...(company.siren ? [{ siren: company.siren }] : []),
    ...(company.siret ? [{ siret: company.siret }] : []),
  ]);
  const existing = identifiers.length
    ? await prisma.techProspect.findMany({
        where: { OR: identifiers },
        select: { id: true, siren: true, siret: true },
      })
    : [];
  const knownSirens = new Set(existing.map((item) => item.siren).filter((value): value is string => Boolean(value)));
  const knownSirets = new Set(existing.map((item) => item.siret).filter((value): value is string => Boolean(value)));

  const eligible = companies.filter((company) => {
    // Without a legal identifier, avoid risky name-only merges and duplicates.
    if (!company.siren && !company.siret) return false;
    if (company.siren && knownSirens.has(company.siren)) return false;
    if (company.siret && knownSirets.has(company.siret)) return false;
    if (company.siren) knownSirens.add(company.siren);
    if (company.siret) knownSirets.add(company.siret);
    return true;
  });

  let imported = 0;
  for (const company of eligible) {
    await prisma.$transaction(async (tx) => {
      const prospect = await tx.techProspect.create({
        data: {
          companyName: company.name,
          siren: company.siren,
          siret: company.siret,
          country: company.country,
          sector: company.apeCode ? `Code APE/NAF ${company.apeCode}` : null,
          website: company.website,
          leadSource: "POLE_1_COMPANY",
          status: "A_QUALIFIER",
          priority: "MOYENNE",
          notes: "Entreprise issue du Pôle 1. Qualification technologique à effectuer. Aucun contact ni démarchage n’a été déclenché.",
          detectionSignals: {
            source: "POLE_1_COMPANY",
            sourceCompanyId: company.id,
            sourceCompanyUpdatedAt: company.updatedAt.toISOString(),
            sourceType: company.sourceType,
            sourceUrl: company.sourceUrl,
            enrichmentStatus: "PENDING",
            contactPermission: "NOT_GRANTED",
          },
          createdByUserId: actor.userId,
        },
      });
      await tx.techProspectEvent.create({
        data: {
          eventType: "IMPORTED_FROM_POLE_1",
          note: "Import contrôlé de l’identité de l’entreprise depuis le Pôle 1. Aucun contact externe déclenché.",
          actorUserId: actor.userId,
          actorRole: actor.role,
          techProspectId: prospect.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          actorRole: actor.role,
          action: "TECH_PROSPECT_IMPORTED_FROM_POLE_1",
          targetType: "TECH_PROSPECT",
          targetId: prospect.id,
          details: { sourceCompanyId: company.id, siren: company.siren, siret: company.siret },
        },
      });
    });
    imported += 1;
  }

  const skippedWithoutIdentifier = companies.filter((company) => !company.siren && !company.siret).length;
  return NextResponse.json({
    scanned: companies.length,
    imported,
    skippedDuplicates: companies.length - eligible.length - skippedWithoutIdentifier,
    skippedWithoutIdentifier,
    limit: 500,
    message: "Import terminé. Les prospects restent à qualifier ; aucun contact externe n’a été déclenché.",
  });
}
