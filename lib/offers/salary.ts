export type ParsedSalary = {
  value: number | null;
  currency: string | null;
  annualized: boolean;
};

/**
 * Converts a salary string into a comparable annual figure when the source
 * provides enough information. Unknown/undetermined salaries remain null and
 * are always placed after disclosed salaries in the offer pool.
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
    .map((m) => m[0].trim())
    .map((raw) => {
      const compact = raw.replace(/\s/g, "").toLowerCase();
      const suffix = compact.endsWith("m") ? 1_000_000 : compact.endsWith("k") ? 1_000 : 1;
      const base = compact.replace(/[km]$/, "").replace(/,/g, "");
      const normalized = base.includes(".") ? base : base.replace(/\./g, "");
      const n = Number(normalized.replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) && n > 0 ? n * suffix : null;
    })
    .filter((n): n is number => n !== null);

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
