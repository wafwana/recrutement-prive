import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type OutflowOriginModule =
  | "PAIE"
  | "PRESTATAIRE"
  | "FRAIS_PRO"
  | "REMBOURSEMENT"
  | "FOURNISSEUR"
  | "PRELEVEMENT_OWNER"
  | "AUTRE";

export type OutflowStatus =
  | "PREVU"
  | "AUTORISE"
  | "PAYE"
  | "RAPPROCHE"
  | "A_COMPLETER"
  | "ANNULE";

export type OutflowAuditEntry = {
  timestamp: string;
  actorUserId: string;
  actorRole: string;
  action: string;
  notes?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
};

export interface CreateOrSyncOutflowInput {
  id?: string;
  payoutRequestId?: string;
  beneficiaryName: string;
  beneficiaryEmail?: string | null;
  reason: string;
  description?: string | null;
  category?: string | null;
  originModule?: OutflowOriginModule;
  amountHt: number;
  amountTva?: number;
  amountTtc: number;
  currency?: string;
  paymentMethod?: string | null;
  paymentSource?: string | null;
  referenceNumber?: string | null;
  documentUrl?: string | null;
  documentId?: string | null;
  createdById: string;
  authorizedById?: string | null;
  operationDate?: Date;
  paymentDate?: Date | null;
  status?: OutflowStatus;
  reconciliationStatus?: string;
  isPrivateOwnerExpense?: boolean;
  actorRole?: string;
}

/**
 * Validates server-side that amounts match HT + TVA = TTC (within 0.02 tolerance).
 */
export function validateOutflowAmounts(amountHt: number, amountTva: number, amountTtc: number): boolean {
  if (amountHt < 0 || amountTva < 0 || amountTtc <= 0) return false;
  const expectedTtc = Math.round((amountHt + amountTva) * 100) / 100;
  const actualTtc = Math.round(amountTtc * 100) / 100;
  return Math.abs(expectedTtc - actualTtc) <= 0.02;
}

/**
 * Determines whether an outflow needs additional documentation or category completion.
 * An outflow is tagged "A_COMPLETER" if category is missing or if status is not ANNULE and document is required but absent.
 */
export function evaluateOutflowStatus(
  requestedStatus: OutflowStatus,
  category?: string | null,
  documentUrl?: string | null,
  documentId?: string | null
): OutflowStatus {
  if (requestedStatus === "ANNULE") return "ANNULE";
  const hasDoc = Boolean((documentUrl && documentUrl.trim().length > 0) || (documentId && documentId.trim().length > 0));
  const hasCat = Boolean(category && category.trim().length > 0);

  if (!hasCat || !hasDoc) {
    return "A_COMPLETER";
  }
  return requestedStatus;
}

/**
 * Generates a unique sequential outflow number: OUT-YYYYMMDD-XXXX
 */
export async function generateOutflowNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `OUT-${dateStr}-`;

  const lastOutflow = await prisma.financialOutflow.findFirst({
    where: { outflowNumber: { startsWith: prefix } },
    orderBy: { outflowNumber: "desc" },
    select: { outflowNumber: true },
  });

  if (!lastOutflow) {
    return `${prefix}0001`;
  }

  const parts = lastOutflow.outflowNumber.split("-");
  const lastSeq = parseInt(parts[parts.length - 1] || "0", 10);
  const nextSeq = (lastSeq + 1).toString().padStart(4, "0");
  return `${prefix}${nextSeq}`;
}

/**
 * Creates or synchronizes an outflow idempotently to prevent double-counting.
 */
export async function createOrSyncOutflow(input: CreateOrSyncOutflowInput) {
  if (!validateOutflowAmounts(input.amountHt, input.amountTva ?? 0, input.amountTtc)) {
    throw new Error("Montants invalides : HT + TVA doit être égal à TTC.");
  }

  // Check if existing by payoutRequestId or id
  let existing = null;
  if (input.payoutRequestId) {
    existing = await prisma.financialOutflow.findUnique({
      where: { payoutRequestId: input.payoutRequestId },
    });
  }
  if (!existing && input.id) {
    existing = await prisma.financialOutflow.findUnique({
      where: { id: input.id },
    });
  }

  const effectiveStatus = evaluateOutflowStatus(
    input.status || "PAYE",
    input.category,
    input.documentUrl,
    input.documentId
  );

  const nowIso = new Date().toISOString();
  const initialAudit: OutflowAuditEntry = {
    timestamp: nowIso,
    actorUserId: input.createdById,
    actorRole: input.actorRole || "OWNER",
    action: existing ? "SYNC_OUTFLOW" : "CREATE_OUTFLOW",
    notes: input.reason,
  };

  if (!existing) {
    const outflowNumber = await generateOutflowNumber();
    return await prisma.financialOutflow.create({
      data: {
        outflowNumber,
        operationDate: input.operationDate || new Date(),
        paymentDate: input.paymentDate || (input.status === "PAYE" ? new Date() : null),
        beneficiaryName: input.beneficiaryName,
        beneficiaryEmail: input.beneficiaryEmail || null,
        reason: input.reason,
        description: input.description || null,
        category: input.category || null,
        originModule: input.originModule || "AUTRE",
        amountHt: input.amountHt,
        amountTva: input.amountTva ?? 0,
        amountTtc: input.amountTtc,
        currency: input.currency || "EUR",
        paymentMethod: input.paymentMethod || "VIREMENT",
        paymentSource: input.paymentSource || "COMPTE_PRINCIPAL",
        referenceNumber: input.referenceNumber || null,
        documentUrl: input.documentUrl || null,
        documentId: input.documentId || null,
        createdById: input.createdById,
        authorizedById: input.authorizedById || input.createdById,
        status: effectiveStatus,
        reconciliationStatus: input.reconciliationStatus || "NON_RAPPROCHE",
        isPrivateOwnerExpense: input.isPrivateOwnerExpense ?? false,
        payoutRequestId: input.payoutRequestId || null,
        auditHistory: [initialAudit as unknown as Prisma.InputJsonValue],
      },
    });
  } else {
    // Prevent silent updates without audit
    const currentAudit = Array.isArray(existing.auditHistory)
      ? (existing.auditHistory as unknown as OutflowAuditEntry[])
      : [];

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (existing.status !== effectiveStatus) changes.status = { from: existing.status, to: effectiveStatus };
    if (input.category && existing.category !== input.category) changes.category = { from: existing.category, to: input.category };
    if (input.documentUrl && existing.documentUrl !== input.documentUrl) changes.documentUrl = { from: existing.documentUrl, to: input.documentUrl };

    const updatedAuditEntry: OutflowAuditEntry = {
      timestamp: nowIso,
      actorUserId: input.createdById,
      actorRole: input.actorRole || "OWNER",
      action: "UPDATE_OUTFLOW",
      changes,
    };

    return await prisma.financialOutflow.update({
      where: { id: existing.id },
      data: {
        beneficiaryName: input.beneficiaryName ?? existing.beneficiaryName,
        beneficiaryEmail: input.beneficiaryEmail !== undefined ? input.beneficiaryEmail : existing.beneficiaryEmail,
        reason: input.reason ?? existing.reason,
        description: input.description !== undefined ? input.description : existing.description,
        category: input.category !== undefined ? input.category : existing.category,
        originModule: input.originModule ?? existing.originModule,
        amountHt: input.amountHt ?? existing.amountHt,
        amountTva: input.amountTva !== undefined ? input.amountTva : existing.amountTva,
        amountTtc: input.amountTtc ?? existing.amountTtc,
        currency: input.currency ?? existing.currency,
        paymentMethod: input.paymentMethod !== undefined ? input.paymentMethod : existing.paymentMethod,
        paymentSource: input.paymentSource !== undefined ? input.paymentSource : existing.paymentSource,
        referenceNumber: input.referenceNumber !== undefined ? input.referenceNumber : existing.referenceNumber,
        documentUrl: input.documentUrl !== undefined ? input.documentUrl : existing.documentUrl,
        documentId: input.documentId !== undefined ? input.documentId : existing.documentId,
        authorizedById: input.authorizedById || existing.authorizedById,
        paymentDate: input.paymentDate !== undefined ? input.paymentDate : existing.paymentDate,
        status: effectiveStatus,
        reconciliationStatus: input.reconciliationStatus ?? existing.reconciliationStatus,
        isPrivateOwnerExpense: input.isPrivateOwnerExpense !== undefined ? input.isPrivateOwnerExpense : existing.isPrivateOwnerExpense,
        auditHistory: [...currentAudit, updatedAuditEntry] as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

/**
 * Formats a list of financial outflows into CSV format for export to expert accountants.
 */
export function exportOutflowsToCsv(outflows: Array<{
  outflowNumber: string;
  operationDate: Date;
  paymentDate?: Date | null;
  beneficiaryName: string;
  beneficiaryEmail?: string | null;
  reason: string;
  category?: string | null;
  originModule: string;
  amountHt: number;
  amountTva: number;
  amountTtc: number;
  currency: string;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  status: string;
  reconciliationStatus: string;
  documentUrl?: string | null;
}>): string {
  const headers = [
    "N° Opération",
    "Date Opération",
    "Date Paiement",
    "Bénéficiaire",
    "Email",
    "Motif",
    "Catégorie",
    "Module Origine",
    "Montant HT",
    "TVA",
    "Montant TTC",
    "Devise",
    "Moyen de Paiement",
    "Référence",
    "Statut",
    "Rapprochement",
    "Pièce Justificative",
  ];

  const escapeCsv = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = outflows.map((o) => [
    escapeCsv(o.outflowNumber),
    escapeCsv(o.operationDate ? new Date(o.operationDate).toISOString().slice(0, 10) : ""),
    escapeCsv(o.paymentDate ? new Date(o.paymentDate).toISOString().slice(0, 10) : ""),
    escapeCsv(o.beneficiaryName),
    escapeCsv(o.beneficiaryEmail || ""),
    escapeCsv(o.reason),
    escapeCsv(o.category || "A_DEFINIR"),
    escapeCsv(o.originModule),
    escapeCsv(o.amountHt.toFixed(2)),
    escapeCsv(o.amountTva.toFixed(2)),
    escapeCsv(o.amountTtc.toFixed(2)),
    escapeCsv(o.currency),
    escapeCsv(o.paymentMethod || ""),
    escapeCsv(o.referenceNumber || ""),
    escapeCsv(o.status),
    escapeCsv(o.reconciliationStatus),
    escapeCsv(o.documentUrl ? "OUI" : "NON"),
  ]);

  return [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
}
