import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getPartnerDetails } from "@/lib/partenaires/partner-service";
import PartnerDetailClient from "./PartnerDetailClient";

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") {
    redirect("/connexion");
  }

  if (!(await hasPermission(session.user.id, session.user.role, "PARTNERS_MANAGE"))) {
    redirect("/espace/owner");
  }

  const { id } = await params;
  const partner = await getPartnerDetails(id);

  if (!partner) {
    notFound();
  }

  const serializedPartner = {
    ...partner,
    createdAt: partner.createdAt.toISOString(),
    updatedAt: partner.updatedAt.toISOString(),
    lastQualifiedAt: partner.lastQualifiedAt ? partner.lastQualifiedAt.toISOString() : null,
    lastContactAt: partner.lastContactAt ? partner.lastContactAt.toISOString() : null,
    lastVerifiedAt: partner.lastVerifiedAt ? partner.lastVerifiedAt.toISOString() : null,
    discoveredAt: partner.discoveredAt.toISOString(),
    contacts: partner.contacts.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      collectedAt: c.collectedAt.toISOString(),
    })),
    agreements: partner.agreements.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      startDate: a.startDate ? a.startDate.toISOString() : null,
      endDate: a.endDate ? a.endDate.toISOString() : null,
    })),
    history: partner.history.map((h) => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
    })),
  };

  return (
    <PartnerDetailClient
      partner={serializedPartner}
      currentUserRole={session.user.role || "CONSULTANT"}
    />
  );
}
