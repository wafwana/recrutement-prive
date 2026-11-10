import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";

export type TechActor = { userId: string; role: string; isOwner: boolean };

export async function getTechActor(): Promise<TechActor | NextResponse> {
  const session = getActiveSessionContext() || await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || !role) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const isOwner = role === "OWNER";
  if (!isOwner && !["ADMIN", "CONSULTANT"].includes(role)) {
    return NextResponse.json({ error: "Accès réservé aux collaborateurs habilités." }, { status: 403 });
  }
  if (!isOwner && !(await hasPermission(userId, role, "TECH_SOLUTIONS_MANAGE"))) {
    return NextResponse.json({ error: "Permission TECH_SOLUTIONS_MANAGE requise." }, { status: 403 });
  }
  return { userId, role, isOwner };
}
export function isTechActor(value: TechActor | NextResponse): value is TechActor {
  return !(value instanceof NextResponse);
}
export const DEFAULT_TECH_PIPELINE = [
  { key: "NOUVEAU", label: "Nouveau" },
  { key: "A_QUALIFIER", label: "À qualifier" },
  { key: "QUALIFIE", label: "Qualifié" },
  { key: "CONTACTE", label: "Contacté" },
  { key: "CDC_RECU", label: "Cahier des charges reçu" },
  { key: "CHIFFRAGE", label: "Chiffrage" },
  { key: "PROPOSITION", label: "Proposition" },
  { key: "SIGNE", label: "Signé" },
  { key: "ABANDONNE", label: "Abandonné" },
] as const;
