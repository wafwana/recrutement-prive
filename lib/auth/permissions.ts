import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

// Each functional Owner tab has its own atomic permission.
// Permission names deliberately follow the corresponding module/folder name
// so the Owner can immediately identify exactly what is being granted.
export const PERMISSIONS = [
  "CANDIDATES_VIEW",
  "CANDIDATES_MANAGE",
  "CV_INTAKE",
  "CV_LIBRARY",
  "CV_MATCHING",
  "METIERS_DOSSIERS",
  "SOURCING",
  "OFFRES_VIVIER",
  "ARCHIVAGE",
  "PRE_COMPTABILITE",
  "PRESTATIONS_TARIFS",
  "FACTURATION",
  "JOBS_MANAGE",
  "PRESENTATIONS_MANAGE",
  "COMPANIES_MANAGE",
  "CRM",
  "REPORTING",
  "DOCUMENTS_DEPOSIT",
  "DOCUMENTS_VIEW",
  "MESSAGING_CLIENTS_ENTERPRISE",
  "PLATFORM_SETTINGS",
  "ENTERPRISE_OFFER_SOURCING",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const LEGACY_PERMISSION_ALIASES: Record<string, Permission> = {
  CV_IMPORT: "CV_INTAKE",
  MATCHING: "CV_MATCHING",
  ARCHIVING: "ARCHIVAGE",
  PRE_ACCOUNTING: "PRE_COMPTABILITE",
  PRICING_MANAGEMENT: "PRESTATIONS_TARIFS",
};

export async function getUserPermissions(userId: string): Promise<Permission[] | null> {
  const record = await prisma.systemSetting.findUnique({
    where: { key: `permissions:${userId}` },
    select: { value: true },
  });
  if (!record) return null;
  const value = record.value;
  if (!Array.isArray(value)) return [];
  const normalized = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    // A granted permission is atomic: it never expands into another
    // business function or access level by association.
    const canonical = LEGACY_PERMISSION_ALIASES[item] || item;
    if ((PERMISSIONS as readonly string[]).includes(canonical)) normalized.add(canonical);
  }
  return [...normalized].filter((item): item is Permission =>
    (PERMISSIONS as readonly string[]).includes(item),
  );
}

export async function hasPermission(userId: string, role: Role | string | undefined, permission: Permission): Promise<boolean> {
  if (role === "OWNER") return true;
  const permissions = await getUserPermissions(userId);
  // Granular governance is explicit for every non-OWNER account.
  // Having a staff role, or having another permission, never grants this one.
  if (permissions === null) return false;
  return permissions.includes(permission);
}

export async function requirePermission(
  userId: string,
  role: Role | string | undefined,
  permission: Permission,
): Promise<boolean> {
  return hasPermission(userId, role, permission);
}
