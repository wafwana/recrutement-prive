export function buildCvFolderPath(
  primaryCategoryCode: string | null | undefined,
  subCategoryCode: string | null | undefined,
  year = new Date().getFullYear(),
) {
  const primary = primaryCategoryCode || "A_CLASSER";
  const sub = subCategoryCode || "GENERAL";
  return `CANDIDATS/${primary}/${sub}/CV/${year}`;
}
