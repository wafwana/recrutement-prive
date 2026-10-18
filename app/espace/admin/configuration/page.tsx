import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import AdminConfigurationClient from "./ConfigurationClient";

export default async function AdminConfigurationPage() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "OWNER")) {
    redirect("/connexion");
  }

  if (!(await hasPermission(session.user.id, session.user.role, "PLATFORM_SETTINGS"))) {
    redirect(session.user.role === "ADMIN" ? "/espace/admin" : "/espace");
  }

  return <AdminConfigurationClient />;
}
