export type OwnerDashboardSnapshot = {
  candidates: { total: number; newCount: number; incomplete: number };
  cvs: { received: number; linked: number; unlinked: number };
  companies: { total: number; priority: number; strategic: number };
  jobs: { total: number; active: number; pending: number };
  matching: { evaluated: number; highScore: number; awaitingValidation: number };
  sourcing: { detectedCandidates: number; detectedCompanies: number; pendingValidation: number };
  automations: { active: number; errors: number; paused: number };
  users: { total: number; admins: number; consultants: number };
  system: { database: "ok" | "warning" | "error"; storage: "ok" | "warning" | "error"; deployment: "ok" | "warning" | "error" };
};

export type OwnerDashboardStatus = "OPERATIONAL" | "PARTIAL" | "ERROR";

export function getOwnerDashboardStatus(snapshot: OwnerDashboardSnapshot): OwnerDashboardStatus {
  const systems = Object.values(snapshot.system);
  if (systems.includes("error")) return "ERROR";
  if (systems.includes("warning") || snapshot.automations.errors > 0) return "PARTIAL";
  return "OPERATIONAL";
}
