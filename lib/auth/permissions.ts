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
  "MESSAGING",
  "REPORTING",
  "DOCUMENTS",
  "PLATFORM_SETTINGS",
  "FINANCE",
  "STAFF_MANAGE",
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
  return value.filter((item): item is Permission =>
    typeof item === "string" && (PERMISSIONS as readonly string[]).includes(item),
  );
}

export async function hasPermission(userId: string, role: Role | string | undefined, permission: Permission): Promise<boolean> {
  if (role === "OWNER") return true;
  const permissions = await getUserPermissions(userId);
  // Backward compatibility: users created before granular governance keep their
  // existing role access until the OWNER explicitly configures their matrix.
  if (permissions === null) return role === "ADMIN" || role === "CONSULTANT";
  return permissions.includes(permission);
}

export async function requirePermission(
  userId: string,
  role: Role | string | undefined,
  permission: Permission,
): Promise<boolean> {
  return hasPermission(userId, role, permission);
}
