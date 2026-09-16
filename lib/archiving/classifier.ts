export type ClassificationInput = {
  fileName: string;
  docType?: string;
  senderRole: string;
  companyId?: string;
  candidateId?: string;
  jobId?: string;
  amountHt?: number;
  amountTtc?: number;
  date?: Date;
};

export type ClassificationResult = {
  categoryPath: string;
  status: "VERIFIE" | "A_VERIFIER";
  isAmbiguous: boolean;
  year: number;
  month: number;
  quarter: number;
};

const MONTH_NAMES = [
  "JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN",
  "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE"
];

export function classifyDocument(input: ClassificationInput): ClassificationResult {
  const fileDate = input.date || new Date();
  const year = fileDate.getFullYear();
  const month = fileDate.getMonth() + 1; // 1-12
  const quarter = Math.ceil(month / 3);
  const monthName = MONTH_NAMES[month - 1];

  const nameUpper = input.fileName.toUpperCase();
  const typeUpper = (input.docType || "").toUpperCase();

  let categoryPath = "";
  let isAmbiguous = false;

  if (
    typeUpper.includes("FACTURE") ||
    nameUpper.includes("FACTURE") ||
    typeUpper.includes("BILL") ||
    typeUpper.includes("INVOICE")
  ) {
    categoryPath = `ARCHIVAGE/FINANCE/FACTURES/${year}/${monthName}`;
  } else if (
    typeUpper.includes("JUSTIFICATIF") ||
    nameUpper.includes("JUSTIFICATIF") ||
    typeUpper.includes("NOTE_DE_FRAIS") ||
    typeUpper.includes("RECEIPT")
  ) {
    categoryPath = `ARCHIVAGE/FINANCE/JUSTIFICATIFS/${year}/${monthName}`;
  } else if (
    typeUpper.includes("CONTRAT") ||
    nameUpper.includes("CONTRAT") ||
    typeUpper.includes("CONVENTION")
  ) {
    categoryPath = `ARCHIVAGE/CONTRATS/${input.senderRole.toUpperCase()}`;
  } else if (
    typeUpper.includes("COMPTABILITE") ||
    typeUpper.includes("RELEVE") ||
    nameUpper.includes("RELEVE")
  ) {
    categoryPath = `ARCHIVAGE/COMPTABILITE/${year}/${monthName}`;
  } else if (input.candidateId || input.senderRole === "CANDIDAT" || typeUpper.includes("CV") || typeUpper.includes("CANDIDAT")) {
    categoryPath = `ARCHIVAGE/CANDIDATS/DOSSIER_CANDIDAT`;
  } else if (input.companyId || input.senderRole === "ENTREPRISE" || typeUpper.includes("ENTREPRISE")) {
    categoryPath = `ARCHIVAGE/ENTREPRISES/DOSSIER_ENTREPRISE`;
  } else if (input.jobId || typeUpper.includes("MISSION")) {
    categoryPath = `ARCHIVAGE/MISSIONS/DOSSIER_MISSION`;
  } else {
    // Cannot determine with certainty
    categoryPath = "ARCHIVAGE/A_CLASSER/A_VERIFIER";
    isAmbiguous = true;
  }

  return {
    categoryPath,
    status: isAmbiguous ? "A_VERIFIER" : "A_VERIFIER", // Initial status for all deposits is A_VERIFIER until OWNER validates or accepts
    isAmbiguous,
    year,
    month,
    quarter,
  };
}
