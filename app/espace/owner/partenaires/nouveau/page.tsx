import { redirect } from "next/navigation";
import { auth } from "@/auth";
import NewPartnerClient from "./NewPartnerClient";
export default async function NewPartnerPage() { const session = await auth(); if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion"); return <NewPartnerClient />; }
