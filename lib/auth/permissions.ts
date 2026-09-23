import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const PERMISSIONS = [
  "CANDIDATES_VIEW",
  "CANDIDATES_MANAGE",
  "CV_IMPORT",
  "SOURCING",
  "MATCHING",
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
    if ((PERMISSIONS as readonly string[]).includes(item)) normalized.add(item);
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
