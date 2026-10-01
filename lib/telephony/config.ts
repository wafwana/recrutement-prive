import { prisma } from "@/lib/prisma";
import type { TelephonySettings } from "./types";

export const DEFAULT_TELEPHONY_SETTINGS: TelephonySettings = {
  centralPhoneNumber: "+33100000000",
  ownerPhone: "+33600000000",
  secondaryPhone: null,
  ringMode: "SEQUENTIAL",
  transferDelaySeconds: 15,
  businessHours: {
    enabled: true,
    timezone: "Europe/Paris",
    start: "08:30",
    end: "19:00",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  offHoursBehavior: "VOICEMAIL",
  customIvrGreeting:
    "Bonjour, vous êtes bien chez Recrutement Privé. Pour une entreprise, tapez 1. Pour un candidat, tapez 2. Pour un partenaire, tapez 3. Pour joindre un collaborateur, tapez 4. Pour toute autre demande, tapez 5.",
};

export async function getTelephonySettings(): Promise<TelephonySettings> {
  if (!process.env.DATABASE_URL) {
    return DEFAULT_TELEPHONY_SETTINGS;
  }

  try {
    const configRecord = await prisma.telephonyConfig.findFirst();
    if (!configRecord) {
      return DEFAULT_TELEPHONY_SETTINGS;
    }

    const bh = (configRecord.businessHours as TelephonySettings["businessHours"]) || DEFAULT_TELEPHONY_SETTINGS.businessHours;

    return {
      centralPhoneNumber: configRecord.centralPhoneNumber || DEFAULT_TELEPHONY_SETTINGS.centralPhoneNumber,
      ownerPhone: configRecord.ownerPhone || DEFAULT_TELEPHONY_SETTINGS.ownerPhone,
      secondaryPhone: configRecord.secondaryPhone || DEFAULT_TELEPHONY_SETTINGS.secondaryPhone,
      ringMode: configRecord.ringMode === "SIMULTANEOUS" ? "SIMULTANEOUS" : "SEQUENTIAL",
      transferDelaySeconds: configRecord.transferDelaySeconds ?? 15,
      businessHours: bh,
      offHoursBehavior: (configRecord.offHoursBehavior as TelephonySettings["offHoursBehavior"]) || "VOICEMAIL",
      customIvrGreeting: configRecord.customIvrGreeting || DEFAULT_TELEPHONY_SETTINGS.customIvrGreeting,
    };
  } catch (err) {
    console.error("[getTelephonySettings] Error fetching settings:", err);
    return DEFAULT_TELEPHONY_SETTINGS;
  }
}

export async function updateTelephonySettings(
  partial: Partial<TelephonySettings>
): Promise<TelephonySettings> {
  const current = await getTelephonySettings();
  const updated: TelephonySettings = {
    ...current,
    ...partial,
  };

  if (!process.env.DATABASE_URL) {
    return updated;
  }

  const existing = await prisma.telephonyConfig.findFirst();
  if (existing) {
    await prisma.telephonyConfig.update({
      where: { id: existing.id },
      data: {
        centralPhoneNumber: updated.centralPhoneNumber,
        ownerPhone: updated.ownerPhone,
        secondaryPhone: updated.secondaryPhone,
        ringMode: updated.ringMode,
        transferDelaySeconds: updated.transferDelaySeconds,
        businessHours: updated.businessHours as any,
        offHoursBehavior: updated.offHoursBehavior,
        customIvrGreeting: updated.customIvrGreeting,
      },
    });
  } else {
    await prisma.telephonyConfig.create({
      data: {
        centralPhoneNumber: updated.centralPhoneNumber,
        ownerPhone: updated.ownerPhone,
        secondaryPhone: updated.secondaryPhone,
        ringMode: updated.ringMode,
        transferDelaySeconds: updated.transferDelaySeconds,
        businessHours: updated.businessHours as any,
        offHoursBehavior: updated.offHoursBehavior,
        customIvrGreeting: updated.customIvrGreeting,
      },
    });
  }

  return updated;
}
