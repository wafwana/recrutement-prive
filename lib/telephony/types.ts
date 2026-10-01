export type IvrCategory = "ENTERPRISE" | "CANDIDATE" | "PARTNER" | "COLLABORATOR" | "OTHER";

export type CallDirection = "INBOUND" | "OUTBOUND";

export type RingMode = "SEQUENTIAL" | "SIMULTANEOUS";

export type CallStatus =
  | "INITIATED"
  | "RINGING"
  | "ANSWERED"
  | "TRANSFERRED"
  | "MISSED"
  | "REJECTED"
  | "VOICEMAIL"
  | "BUSY"
  | "FAILED";

export type CallTreatmentState = "NEW" | "TO_RECALL" | "PROCESSED";

export interface IdentifiedCaller {
  phoneNumber: string;
  normalizedNumber: string;
  name: string | null;
  category: IvrCategory;
  entityType: "CANDIDATE" | "COMPANY" | "PARTNER" | "USER" | "UNKNOWN";
  entityId: string | null;
  confidence: "EXACT_CONTACT" | "IVR_SELECTION_ONLY" | "UNKNOWN";
}

export interface TelephonySettings {
  centralPhoneNumber: string;
  ownerPhone: string;
  secondaryPhone: string | null;
  ringMode: RingMode;
  transferDelaySeconds: number;
  businessHours: {
    enabled: boolean;
    timezone: string;
    start: string; // e.g. "08:30"
    end: string; // e.g. "19:00"
    daysOfWeek: number[]; // 1-5 (Mon-Fri)
  };
  offHoursBehavior: "VOICEMAIL" | "REJECT" | "TRANSFER_OWNER";
  customIvrGreeting?: string | null;
}

export interface InboundCallInput {
  callerNumber: string;
  ivrChoice?: string | number | null;
  callSid?: string;
}

export interface InboundRoutingResult {
  mode: "SIMULATION" | "LIVE";
  callLogId: string;
  caller: IdentifiedCaller;
  selectedCategory: IvrCategory;
  announcementText: string;
  ringMode: RingMode;
  primaryPhone: string;
  secondaryPhone: string | null;
  transferDelaySeconds: number;
  isOffHours: boolean;
  action: "FORWARD" | "VOICEMAIL" | "REJECT";
}

export interface OutboundCallRequest {
  initiatorUserId: string;
  targetPhoneNumber: string;
  linkedEntityId?: string;
  linkedEntityType?: "CANDIDATE" | "COMPANY" | "PARTNER";
}

export interface OutboundCallResult {
  ok: boolean;
  mode: "SIMULATION" | "LIVE";
  callLogId?: string;
  callerIdUsed?: string;
  status?: CallStatus;
  error?: string;
}
