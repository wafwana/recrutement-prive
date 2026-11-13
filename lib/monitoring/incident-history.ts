import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

type IncidentInput = {
  module: "CV" | "CANDIDAT" | "ENTREPRISE" | "SOURCING" | "MATCHING" | "DOCUMENTS" | "PLATFORM";
  event: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  route?: string;
  summary: string;
  correlationId?: string;
};

/**
 * Best-effort technical incident history stored in the existing AuditLog table.
 * No schema migration or extra database service is required. Never persist raw
 * exception messages, stack traces, request bodies, CV content, emails or secrets.
 */
export async function recordTechnicalIncident(input: IncidentInput): Promise<void> {
  try {
    const module = input.module;
    const event = input.event.replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 80) || "UNKNOWN";
    const summary = input.summary.replace(/[\r\n\t]/g, " ").slice(0, 240);
    const route = input.route?.split("?")[0].replace(/[^a-zA-Z0-9_\-/.[\]]/g, "").slice(0, 180) || null;
    const fingerprint = createHash("sha256").update([module, event, route || "", summary].join("|")).digest("hex").slice(0, 32);
    const correlationId = input.correlationId?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || null;
    await prisma.auditLog.create({
      data: {
        actorUserId: "SYSTEM",
        actorRole: "SYSTEM",
        action: "TECHNICAL_INCIDENT",
        targetType: module,
        targetId: fingerprint,
        details: {
          module,
          event,
          severity: input.severity || "MEDIUM",
          route,
          summary,
          fingerprint,
          correlationId,
          status: "OPEN",
          occurredAt: new Date().toISOString(),
        },
      },
    });
  } catch (loggingError) {
    // Incident logging must never break the business operation being observed.
    console.warn("[incident-history] unable to persist incident event", loggingError instanceof Error ? loggingError.name : "UnknownError");
  }
}
