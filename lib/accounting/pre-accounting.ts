import { prisma } from "@/lib/prisma";

export type MonthlySummary = {
  year: number;
  month: number;
  monthName: string;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  invoicesCount: number;
  paymentsCount: number;
  unpaidInvoicesCount: number;
  anomaliesCount: number;
  missingDocsCount: number;
  reconciliationStatus: "OK" | "A_VERIFIER" | "ANOMALIE";
  status: "EN_COURS" | "COMPLET" | "DOSSIER_COMPTABLE_PRET";
  folders: string[];
};

export type QuarterlyDossier = {
  year: number;
  quarter: number;
  quarterName: string; // T1, T2, T3, T4
  months: MonthlySummary[];
  quarterTotalHt: number;
  quarterTotalTva: number;
  quarterTotalTtc: number;
  isLocked: boolean;
  status: string;
};

const MONTH_NAMES = [
  "JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN",
  "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE"
];

export const ACCOUNTING_FOLDERS = [
  "01_FACTURES",
  "02_AVOIRS",
  "03_PAIEMENTS",
  "04_RECETTES",
  "05_DEPENSES",
  "06_HONORAIRES",
  "07_COMMISSIONS",
  "08_JUSTIFICATIFS",
  "09_CONTRATS",
  "10_TVA",
  "11_RELEVES_ET_RAPPROCHEMENTS",
  "12_NOTES_ET_FRAIS",
  "13_ECRITURES_PREPAREES",
  "14_CONTROLES",
  "15_SYNTHESE_MENSUELLE",
];

export async function generateMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
  const monthName = MONTH_NAMES[month - 1];

  const docs = await prisma.archivedDocument.findMany({
    where: {
      year,
      month,
    },
    select: {
      id: true,
      name: true,
      categoryPath: true,
      amountHt: true,
      amountTva: true,
      amountTtc: true,
      docType: true,
      status: true,
    },
  });

  let totalHt = 0;
  let totalTva = 0;
  let totalTtc = 0;
  let invoicesCount = 0;
  let paymentsCount = 0;
  let anomaliesCount = 0;
  let missingDocsCount = 0;

  for (const doc of docs) {
    if (doc.amountHt) totalHt += doc.amountHt;
    if (doc.amountTva) totalTva += doc.amountTva;
    if (doc.amountTtc) totalTtc += doc.amountTtc;

    if (doc.categoryPath.includes("FACTURES") || (doc.docType && doc.docType.includes("FACTURE"))) {
      invoicesCount++;
    }
    if (doc.categoryPath.includes("PAIEMENTS") || (doc.docType && doc.docType.includes("PAIEMENT"))) {
      paymentsCount++;
    }
    if (doc.status === "A_VERIFIER" || doc.status === "ANOMALIE") {
      anomaliesCount++;
    }
  }

  // Detect missing justificatifs if invoices > payments
  const unpaidInvoicesCount = Math.max(0, invoicesCount - paymentsCount);
  if (unpaidInvoicesCount > 0) {
    missingDocsCount += unpaidInvoicesCount;
  }

  const reconciliationStatus = anomaliesCount > 0 ? "ANOMALIE" : unpaidInvoicesCount > 0 ? "A_VERIFIER" : "OK";

  // Check if period is locked in AccountingPeriod
  const period = await prisma.accountingPeriod.findUnique({
    where: {
      year_month_periodType: {
        year,
        month,
        periodType: "MONTHLY",
      },
    },
  });

  const status = period?.isLocked ? "DOSSIER_COMPTABLE_PRET" : anomaliesCount === 0 && missingDocsCount === 0 ? "COMPLET" : "EN_COURS";

  return {
    year,
    month,
    monthName,
    totalHt,
    totalTva,
    totalTtc,
    invoicesCount,
    paymentsCount,
    unpaidInvoicesCount,
    anomaliesCount,
    missingDocsCount,
    reconciliationStatus,
    status,
    folders: ACCOUNTING_FOLDERS.map((f) => `COMPTABILITE/${year}/${monthName}/${f}`),
  };
}

export async function generateQuarterlyDossier(year: number, quarter: number): Promise<QuarterlyDossier> {
  const startMonth = (quarter - 1) * 3 + 1;
  const month1 = await generateMonthlySummary(year, startMonth);
  const month2 = await generateMonthlySummary(year, startMonth + 1);
  const month3 = await generateMonthlySummary(year, startMonth + 2);

  const months = [month1, month2, month3];

  const quarterTotalHt = months.reduce((acc, m) => acc + m.totalHt, 0);
  const quarterTotalTva = months.reduce((acc, m) => acc + m.totalTva, 0);
  const quarterTotalTtc = months.reduce((acc, m) => acc + m.totalTtc, 0);

  const period = await prisma.accountingPeriod.findFirst({
    where: {
      year,
      quarter,
      periodType: "QUARTERLY",
    },
  });

  return {
    year,
    quarter,
    quarterName: `T${quarter}`,
    months,
    quarterTotalHt,
    quarterTotalTva,
    quarterTotalTtc,
    isLocked: period?.isLocked ?? false,
    status: period?.isLocked ? "DOSSIER COMPTABLE PRÊT ET VERROUILLÉ" : "DOSSIER COMPTABLE EN PRÉPARATION",
  };
}
