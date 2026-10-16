import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import NewPartnerClient from "./NewPartnerClient";

export default async function OwnerNewPartnerPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");
  if (!(await hasPermission(session.user.id, session.user.role, "PARTNERS_MANAGE"))) redirect("/espace");
  return <NewPartnerClient />;
}
