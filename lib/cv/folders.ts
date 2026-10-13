export type CvFolderInput = {
  sectorCode?: string | null;
  professionCode?: string | null;
  year?: number;
  documentKind?: "CV" | "FORMATION" | "CERTIFICATION" | "EXPERIENCE" | "AUTRE";
};

export type CvFolderTaxonomyItem = {
  code: string;
  name?: string;
  parentCode?: string | null;
};

export type CvTaxonomySelection = {
  primaryCategoryCode: string | null;
  subCategoryCodes: string[];
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

/**
 * Restrict CV subcategories to children of the selected primary sector.
 * Local text extraction may find terms from several sectors in one CV; those
 * incidental matches must not be persisted as unrelated subcategories.
 */
export function resolveCvTaxonomySelection(
  analysis: unknown,
  taxonomy: CvFolderTaxonomyItem[],
): CvTaxonomySelection {
  const record = analysis && typeof analysis === "object" && !Array.isArray(analysis)
    ? analysis as Record<string, unknown>
    : {};
  const requestedPrimary = typeof record.primaryCategoryCode === "string"
    ? record.primaryCategoryCode
    : null;
  const primary = taxonomy.find((item) => item.code === requestedPrimary && !item.parentCode);
  if (!primary) return { primaryCategoryCode: null, subCategoryCodes: [] };

  const requestedSubcategories = Array.isArray(record.subCategoryCodes)
    ? record.subCategoryCodes.filter((value): value is string => typeof value === "string")
    : [];
  const validSubcategories = new Set(
    taxonomy
      .filter((item) => item.parentCode === primary.code)
      .map((item) => item.code),
  );

  return {
    primaryCategoryCode: primary.code,
    subCategoryCodes: [...new Set(requestedSubcategories.filter((code) => validSubcategories.has(code)))],
  };
}

export function buildCandidateFolderFromAnalysis(
  analysis: unknown,
  taxonomy: CvFolderTaxonomyItem[],
  year?: number,
  documentKind: CvFolderInput["documentKind"] = "CV",
) {
  const selection = resolveCvTaxonomySelection(analysis, taxonomy);
  return buildCandidateFolder({
    sectorCode: selection.primaryCategoryCode,
    professionCode: selection.subCategoryCodes[0] || null,
    year,
    documentKind,
  });
}

export function buildProfessionRoot(sectorCode?: string | null, professionCode?: string | null) {
  const sector = safeSegment(sectorCode, "A_CLASSER");
  const profession = safeSegment(professionCode, "A_VERIFIER");
  return `CANDIDATS/${sector}/${profession}/DOSSIER_CANDIDAT`;
}
