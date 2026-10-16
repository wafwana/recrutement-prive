import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import NewPartnerClient from "./NewPartnerClient";
export default async function AdminNewPartnerPage() { const session = await auth(); if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/connexion"); if (!(await hasPermission(session.user.id, session.user.role, "PARTNERS_MANAGE"))) redirect("/espace/admin"); return <NewPartnerClient />; }
