import { prisma } from "@/lib/prisma";
import type { IdentifiedCaller, IvrCategory } from "./types";

/**
 * Normalizes phone numbers to standard digits/E.164 format for searching.
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return "";
  let digits = rawPhone.replace(/[^\d+]/g, "");
  if (digits.startsWith("0") && !digits.startsWith("+")) {
    digits = "+33" + digits.slice(1);
  }
  return digits;
}

export function mapIvrChoiceToCategory(choice: string | number | null | undefined): IvrCategory {
  const strChoice = String(choice ?? "").trim();
  switch (strChoice) {
    case "1":
      return "ENTERPRISE";
    case "2":
      return "CANDIDATE";
    case "3":
      return "PARTNER";
    case "4":
      return "COLLABORATOR";
    case "5":
    default:
      return "OTHER";
  }
}

/**
 * Searches candidates, company contacts, partner contacts, and platform users
 * to match incoming phone numbers to known RP records.
 */
export async function identifyCallerByPhone(
  rawPhoneNumber: string,
  ivrChoice?: string | number | null
): Promise<IdentifiedCaller> {
  const normalized = normalizePhoneNumber(rawPhoneNumber);
  const ivrCategory = mapIvrChoiceToCategory(ivrChoice);

  if (!process.env.DATABASE_URL || !normalized) {
    return {
      phoneNumber: rawPhoneNumber,
      normalizedNumber: normalized,
      name: null,
      category: ivrCategory,
      entityType: "UNKNOWN",
      entityId: null,
      confidence: ivrChoice ? "IVR_SELECTION_ONLY" : "UNKNOWN",
    };
  }

  const rawDigitsTail = normalized.replace(/\D/g, "").slice(-8);

  try {
    // 1. Search Candidates
    const candidate = await prisma.candidateProfile.findFirst({
      where: {
        OR: [
          { phone: { contains: rawDigitsTail } },
          { user: { email: { contains: rawDigitsTail } } },
        ],
      },
      include: { user: true },
    });

    if (candidate) {
      return {
        phoneNumber: rawPhoneNumber,
        normalizedNumber: normalized,
        name: candidate.user.name || "Candidat RP",
        category: "CANDIDATE",
        entityType: "CANDIDATE",
        entityId: candidate.id,
        confidence: "EXACT_CONTACT",
      };
    }

    // 2. Search Companies
    const company = await prisma.company.findFirst({
      where: {
        phone: { contains: rawDigitsTail },
      },
    });

    if (company) {
      return {
        phoneNumber: rawPhoneNumber,
        normalizedNumber: normalized,
        name: company.name,
        category: "ENTERPRISE",
        entityType: "COMPANY",
        entityId: company.id,
        confidence: "EXACT_CONTACT",
      };
    }

    // 3. Search Partner Contacts
    const partnerContact = await prisma.partnerContact.findFirst({
      where: {
        phone: { contains: rawDigitsTail },
      },
      include: { partner: true },
    });

    if (partnerContact) {
      return {
        phoneNumber: rawPhoneNumber,
        normalizedNumber: normalized,
        name: `${partnerContact.name} (${partnerContact.partner.officialName})`,
        category: "PARTNER",
        entityType: "PARTNER",
        entityId: partnerContact.partnerId,
        confidence: "EXACT_CONTACT",
      };
    }

    // 4. Search Platform Users (Collaborators/ADMIN/OWNER)
    const collaborator = await prisma.user.findFirst({
      where: {
        role: { in: ["OWNER", "ADMIN", "CONSULTANT"] },
        candidat: {
          phone: { contains: rawDigitsTail },
        },
      },
      include: { candidat: true },
    });

    if (collaborator) {
      return {
        phoneNumber: rawPhoneNumber,
        normalizedNumber: normalized,
        name: collaborator.name || `Équipe RP (${collaborator.role})`,
        category: "COLLABORATOR",
        entityType: "USER",
        entityId: collaborator.id,
        confidence: "EXACT_CONTACT",
      };
    }

    // Fallback: No database record matched
    return {
      phoneNumber: rawPhoneNumber,
      normalizedNumber: normalized,
      name: null,
      category: ivrCategory,
      entityType: "UNKNOWN",
      entityId: null,
      confidence: ivrChoice ? "IVR_SELECTION_ONLY" : "UNKNOWN",
    };
  } catch (err) {
    console.error("[identifyCallerByPhone] Error querying DB:", err);
    return {
      phoneNumber: rawPhoneNumber,
      normalizedNumber: normalized,
      name: null,
      category: ivrCategory,
      entityType: "UNKNOWN",
      entityId: null,
      confidence: ivrChoice ? "IVR_SELECTION_ONLY" : "UNKNOWN",
    };
  }
}
