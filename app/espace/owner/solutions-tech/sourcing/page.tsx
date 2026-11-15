import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { TechInternationalSourcingWorkspace } from "./workspace";

export default async function TechInternationalSourcingPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || !role) redirect("/connexion");
  if (role !== "OWNER" && !(await hasPermission(userId, role, "TECH_SOLUTIONS_MANAGE"))) redirect("/espace");
  return <TechInternationalSourcingWorkspace />;
}
