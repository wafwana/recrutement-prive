import { identifyCallerByPhone } from "./caller-id";
import { getTelephonySettings } from "./config";
import type {
  InboundCallInput,
  InboundRoutingResult,
  IvrCategory,
  OutboundCallRequest,
  OutboundCallResult,
  TelephonySettings,
} from "./types";
import { canMakeOutboundCalls } from "./permissions";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export function isOffHours(settings: TelephonySettings, now: Date = new Date()): boolean {
  if (!settings.businessHours.enabled) return false;

  const day = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  if (!settings.businessHours.daysOfWeek.includes(day)) {
    return true;
  }

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const [startH, startM] = settings.businessHours.start.split(":").map(Number);
  const [endH, endM] = settings.businessHours.end.split(":").map(Number);

  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  return currentMinutes < startMinutes || currentMinutes >= endMinutes;
}

export function buildWhisperAnnouncement(category: IvrCategory): string {
  switch (category) {
    case "ENTERPRISE":
      return "Appel Recrutement Privé — Entreprise";
    case "CANDIDATE":
      return "Appel Recrutement Privé — Candidat";
    case "PARTNER":
      return "Appel Recrutement Privé — Partenaire";
    case "COLLABORATOR":
      return "Appel Recrutement Privé — Collaborateur";
    case "OTHER":
    default:
      return "Appel Recrutement Privé — Autre demande";
  }
}

export interface TelephonyProvider {
  processInboundCall(input: InboundCallInput): Promise<InboundRoutingResult>;
  initiateOutboundCall(
    req: OutboundCallRequest,
    userRole: Role | string
  ): Promise<OutboundCallResult>;
}

export class DefaultTelephonyEngine implements TelephonyProvider {
  async processInboundCall(input: InboundCallInput): Promise<InboundRoutingResult> {
    const settings = await getTelephonySettings();
    const caller = await identifyCallerByPhone(input.callerNumber, input.ivrChoice);
    const selectedCategory = caller.category;
    const announcementText = buildWhisperAnnouncement(selectedCategory);
    const offHours = isOffHours(settings);

    let action: InboundRoutingResult["action"] = "FORWARD";
    if (offHours) {
      action = settings.offHoursBehavior === "REJECT" ? "REJECT" : "VOICEMAIL";
    }

    let callLogId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (process.env.DATABASE_URL) {
      try {
        const log = await prisma.callLog.create({
          data: {
            direction: "INBOUND",
            callerNumber: caller.phoneNumber,
            callerName: caller.name,
            callerType: caller.category,
            ivrChoice: String(input.ivrChoice ?? ""),
            destinationPhone: settings.ownerPhone,
            status: action === "FORWARD" ? "RINGING" : action === "VOICEMAIL" ? "VOICEMAIL" : "REJECTED",
            linkedEntityId: caller.entityId,
            linkedEntityType: caller.entityType !== "UNKNOWN" ? caller.entityType : null,
            notes: `Annonce : "${announcementText}"`,
            treatmentState: "NEW",
          },
        });
        callLogId = log.id;
      } catch (err) {
        console.error("[DefaultTelephonyEngine] Failed to persist inbound call log");
        throw new Error("Erreur de persistance de l'historique d'appel.");
      }
    }

    const mode = process.env.TELEPHONY_PROVIDER_LIVE === "true" ? "LIVE" : "SIMULATION";

    return {
      mode,
      callLogId,
      caller,
      selectedCategory,
      announcementText,
      ringMode: settings.ringMode,
      primaryPhone: settings.ownerPhone,
      secondaryPhone: settings.secondaryPhone,
      transferDelaySeconds: settings.transferDelaySeconds,
      isOffHours: offHours,
      action,
    };
  }

  async initiateOutboundCall(
    req: OutboundCallRequest,
    userRole: Role | string
  ): Promise<OutboundCallResult> {
    const allowed = await canMakeOutboundCalls(req.initiatorUserId, userRole);
    if (!allowed) {
      return {
        ok: false,
        mode: "SIMULATION",
        error: "Appel sortant refusé : vous ne possédez pas l'autorisation nécessaire.",
      };
    }

    const mode = process.env.TELEPHONY_PROVIDER_LIVE === "true" ? "LIVE" : "SIMULATION";

    const settings = await getTelephonySettings();
    let callLogId = `outcall_${Date.now()}`;

    if (process.env.DATABASE_URL) {
      try {
        const log = await prisma.callLog.create({
          data: {
            direction: "OUTBOUND",
            callerNumber: settings.centralPhoneNumber,
            callerName: null,
            destinationPhone: req.targetPhoneNumber,
            status: "INITIATED",
            initiatorUserId: req.initiatorUserId,
            linkedEntityId: req.linkedEntityId || null,
            linkedEntityType: req.linkedEntityType || null,
            treatmentState: "PROCESSED",
          },
        });
        callLogId = log.id;
      } catch (err) {
        console.error("[DefaultTelephonyEngine] Failed to persist outbound call log");
        throw new Error("Erreur de persistance du journal d'appel sortant.");
      }
    }

    return {
      ok: true,
      mode,
      callLogId,
      callerIdUsed: settings.centralPhoneNumber,
      status: "INITIATED",
    };
  }
}

export const telephonyEngine = new DefaultTelephonyEngine();
