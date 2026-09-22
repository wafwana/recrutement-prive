export type CvFolderInput = {
  sectorCode?: string | null;
  professionCode?: string | null;
  year?: number;
  documentKind?: "CV" | "FORMATION" | "CERTIFICATION" | "EXPERIENCE" | "AUTRE";
};

function safeSegment(value: string | null | undefined, fallback: string) {
  const normalized = (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return normalized || fallback;
}

/**
 * Canonical CV library structure:
 * CANDIDATS / SECTEUR / METIER / DOSSIER_CANDIDAT / TYPE / ANNEE
 *
 * The original document stays in the same record; this path only organizes
 * derived retrieval and never rewrites the source file.
 */
export function buildCandidateFolder(input: CvFolderInput) {
  const sector = safeSegment(input.sectorCode, "A_CLASSER");
  const profession = safeSegment(input.professionCode, "A_VERIFIER");
  const year = Number.isInteger(input.year) ? input.year : new Date().getFullYear();
  const kind = input.documentKind || "CV";
  return `CANDIDATS/${sector}/${profession}/DOSSIER_CANDIDAT/${kind}/${year}`;
}

export function buildProfessionRoot(sectorCode?: string | null, professionCode?: string | null) {
  const sector = safeSegment(sectorCode, "A_CLASSER");
  const profession = safeSegment(professionCode, "A_VERIFIER");
  return `CANDIDATS/${sector}/${profession}/DOSSIER_CANDIDAT`;
}
