export type ParsedSalary = {
  value: number | null;
  currency: string | null;
  annualized: boolean;
};

function parseNumericToken(raw: string): number | null {
  const compact = raw.replace(/\s/g, "").toLowerCase();
  const suffix = compact.endsWith("m") ? 1_000_000 : compact.endsWith("k") ? 1_000 : 1;
  const base = compact.replace(/[km]$/, "");
  let normalized = base;

  // Handle common French/European thousands and decimal separators without
  // silently turning 100.000 into 100 or 1,2M into 12M.
  if (normalized.includes(",") && normalized.includes(".")) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (normalized.includes(",")) {
    const parts = normalized.split(",");
    normalized = parts[parts.length - 1].length === 1 || parts[parts.length - 1].length === 2
      ? normalized.replace(",", ".")
      : normalized.replace(/,/g, "");
  } else if (normalized.includes(".")) {
    const parts = normalized.split(".");
    normalized = parts[parts.length - 1].length === 3
      ? normalized.replace(/\./g, "")
      : normalized;
  }

  const n = Number(normalized.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n * suffix : null;
}

/**
 * Converts a disclosed salary into a comparable annual figure when the source
 * gives enough information. Unknown salaries remain null and are deliberately
 * ranked after disclosed salaries.
 */
export function parseSalary(salary: string | null | undefined): ParsedSalary {
  if (!salary) return { value: null, currency: null, annualized: false };

  const text = salary.replace(/\u00a0/g, " ").trim();
  const upper = text.toUpperCase();
  const currency =
    upper.includes("AED") || text.includes("د.إ") ? "AED" :
    upper.includes("USD") || text.includes("$") ? "USD" :
    upper.includes("GBP") || text.includes("£") ? "GBP" :
    upper.includes("INR") || text.includes("₹") ? "INR" :
    upper.includes("EUR") || text.includes("€") ? "EUR" :
    upper.includes("CHF") ? "CHF" :
    upper.includes("CAD") ? "CAD" :
    upper.includes("AUD") ? "AUD" : null;

  const values = [...text.matchAll(/(?:\d[\d\s.,]*)(?:\s*[kKmM])?/g)]
    .map((match) => parseNumericToken(match[0].trim()))
    .filter((value): value is number => value !== null);

  if (!values.length) return { value: null, currency, annualized: false };

  const max = Math.max(...values);
  const monthly = /\b(month|monthly|monthy|mois|mensuel|mensuelle|per\s+month|\/\s*mo)\b/i.test(text);
  const weekly = /\b(week|weekly|semaine|hebdo|per\s+week|\/\s*wk)\b/i.test(text);
  const daily = /\b(day|daily|jour|journalier|per\s+day|\/\s*day)\b/i.test(text);
  const hourly = /\b(hour|hourly|heure|per\s+hour|\/\s*h)\b/i.test(text);
  const annual = /\b(year|yearly|annual|annuel|annuelle|an|\bpa\b|per\s+year|\/\s*yr)\b/i.test(text);

  let factor = 1;
  if (monthly) factor = 12;
  else if (weekly) factor = 52;
  else if (daily) factor = 260;
  else if (hourly) factor = 2080;
  else if (annual) factor = 1;

  return { value: max * factor, currency, annualized: factor !== 1 || annual };
}

export function compareSalaryPriority(a: string | null | undefined, b: string | null | undefined): number {
  const pa = parseSalary(a);
  const pb = parseSalary(b);
  if (pa.value === null && pb.value === null) return 0;
  if (pa.value === null) return 1;
  if (pb.value === null) return -1;
  return pb.value - pa.value;
}
