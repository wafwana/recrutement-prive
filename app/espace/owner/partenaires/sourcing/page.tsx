import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { discoverInstitutionalPartners } from "@/lib/partenaires/sourcing";
import SourcingClient from "./SourcingClient";

export default async function OwnerPartenaireSourcingPage() {
  const session = await auth();
  if (!session?.user?.id || !["OWNER", "ADMIN", "CONSULTANT"].includes(session.user.role || "")) {
    redirect("/connexion");
  }

  if (!(await hasPermission(session.user.id, session.user.role, "PARTNERS_MANAGE"))) {
    const fallbackRedirect = session.user.role === "ADMIN" ? "/espace/admin" : session.user.role === "CONSULTANT" ? "/espace/consultant" : "/espace";
    redirect(fallbackRedirect);
  }

  const initialItems = await discoverInstitutionalPartners();

  return <SourcingClient initialItems={initialItems} />;
}
