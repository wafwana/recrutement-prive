import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";

const serviceTypes = ["SITE_WEB", "E_COMMERCE", "SAAS", "CRM", "PORTAIL", "APPLICATION_METIER", "INTEGRATION", "AUTRE"];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.companyId !== "string" || typeof body.serviceType !== "string" || typeof body.description !== "string") {
      return NextResponse.json({ error: "Entreprise, type de besoin et description requis." }, { status: 400 });
    }
    const access = await requireCompanyAccess(body.companyId);
    const serviceType = body.serviceType.trim();
    const description = body.description.trim();
    if (!serviceTypes.includes(serviceType) || description.length < 10 || description.length > 5000) {
      return NextResponse.json({ error: "Le besoin doit contenir entre 10 et 5 000 caractères." }, { status: 400 });
    }
    const company = await prisma.company.findUnique({
      where: { id: access.companyId },
      select: { id: true, name: true, siren: true, siret: true, country: true, website: true, apeCode: true },
    });
    if (!company) return NextResponse.json({ error: "Entreprise introuvable." }, { status: 404 });
    const prospect = await prisma.$transaction(async (tx) => {
      const created = await tx.techProspect.create({
        data: {
          companyName: company.name,
          siren: company.siren,
          siret: company.siret,
          country: company.country,
          website: company.website,
          sector: company.apeCode ? `Code APE/NAF ${company.apeCode}` : null,
          leadSource: "POLE_1_COMPANY_CLIENT",
          projectNeed: serviceType,
          notes: description,
          status: "CDC_RECU",
          priority: "MOYENNE",
          detectionSignals: {
            source: "POLE_1_COMPANY_CLIENT",
            sourceCompanyId: company.id,
            submittedByUserId: access.userId,
            submittedAt: new Date().toISOString(),
          },
          createdByUserId: access.userId,
        },
      });
      await tx.techProspectEvent.create({
        data: {
          eventType: "CLIENT_REQUEST_SUBMITTED",
          note: "Demande de prestation déposée depuis l'espace entreprise.",
          actorUserId: access.userId,
          actorRole: "ENTREPRISE",
          techProspectId: created.id,
        },
      });
      return created;
    });
    return NextResponse.json({ requestId: prospect.id, message: "Votre demande a bien été transmise." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible d'enregistrer la demande." }, { status: 403 });
  }
}
