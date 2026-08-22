export const ROLES = { OWNER: "OWNER", ADMIN: "ADMIN", CONSULTANT: "CONSULTANT", COMPANY: "COMPANY", CANDIDATE: "CANDIDATE" } as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];
export const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  OWNER: ["*"],
  ADMIN: ["users.manage","candidates.manage","companies.manage","jobs.manage","matching.manage","sourcing.manage","automations.manage","crm.manage","reporting.view","audit.view","settings.manage"],
  CONSULTANT: ["candidates.operate","companies.operate","jobs.operate","matching.view","matching.validate","sourcing.validate","crm.operate","reporting.view"],
  COMPANY: ["company.profile.manage","jobs.manage.own","applications.view.own"],
  CANDIDATE: ["candidate.profile.manage","candidate.cv.manage","applications.view.own"]
};
export function hasPermission(role: Role, permission: string): boolean { return role === ROLES.OWNER || ROLE_PERMISSIONS[role]?.includes("*") === true || ROLE_PERMISSIONS[role]?.includes(permission) === true; }
