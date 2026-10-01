/**
 * Normalization and extraction helpers for offer countries in the job pool.
 */

const COUNTRY_SYNONYMS: Record<string, string> = {
  // France
  FR: "France",
  FRA: "France",
  FRANCE: "France",
  // United States
  US: "États-Unis",
  USA: "États-Unis",
  "UNITED STATES": "États-Unis",
  "UNITED STATES OF AMERICA": "États-Unis",
  ETATS_UNIS: "États-Unis",
  "ETATS UNIS": "États-Unis",
  "ETATS-UNIS": "États-Unis",
  "ÉTATS UNIS": "États-Unis",
  "ÉTATS-UNIS": "États-Unis",
  // United Kingdom
  UK: "Royaume-Uni",
  GB: "Royaume-Uni",
  GBR: "Royaume-Uni",
  "UNITED KINGDOM": "Royaume-Uni",
  "ROYAUME UNI": "Royaume-Uni",
  "ROYAUME-UNI": "Royaume-Uni",
  // Germany
  DE: "Allemagne",
  DEU: "Allemagne",
  GERMANY: "Allemagne",
  ALLEMAGNE: "Allemagne",
  // Spain
  ES: "Espagne",
  ESP: "Espagne",
  SPAIN: "Espagne",
  ESPAGNE: "Espagne",
  // Italy
  IT: "Italie",
  ITA: "Italie",
  ITALY: "Italie",
  ITALIE: "Italie",
  // Switzerland
  CH: "Suisse",
  CHE: "Suisse",
  SWITZERLAND: "Suisse",
  SUISSE: "Suisse",
  // Belgium
  BE: "Belgique",
  BEL: "Belgique",
  BELGIUM: "Belgique",
  BELGIQUE: "Belgique",
  // Luxembourg
  LU: "Luxembourg",
  LUX: "Luxembourg",
  LUXEMBOURG: "Luxembourg",
  // Canada
  CA: "Canada",
  CAN: "Canada",
  CANADA: "Canada",
  // Netherlands
  NL: "Pays-Bas",
  NLD: "Pays-Bas",
  NETHERLANDS: "Pays-Bas",
  "PAYS BAS": "Pays-Bas",
  "PAYS-BAS": "Pays-Bas",
  // United Arab Emirates
  AE: "Émirats arabes unis",
  ARE: "Émirats arabes unis",
  UAE: "Émirats arabes unis",
  "UNITED ARAB EMIRATES": "Émirats arabes unis",
  "EMIRATS ARABES UNIS": "Émirats arabes unis",
  "ÉMIRATS ARABES UNIS": "Émirats arabes unis",
  // Morocco
  MA: "Maroc",
  MAR: "Maroc",
  MOROCCO: "Maroc",
  MAROC: "Maroc",
  // Algeria
  DZ: "Algérie",
  DZA: "Algérie",
  ALGERIA: "Algérie",
  ALGERIE: "Algérie",
  ALGÉRIE: "Algérie",
  // Tunisia
  TN: "Tunisie",
  TUN: "Tunisie",
  TUNISIA: "Tunisie",
  TUNISIE: "Tunisie",
  // Senegal
  SN: "Sénégal",
  SEN: "Sénégal",
  SENEGAL: "Sénégal",
  SÉNÉGAL: "Sénégal",
  // Ivory Coast
  CI: "Côte d'Ivoire",
  CIV: "Côte d'Ivoire",
  "IVORY COAST": "Côte d'Ivoire",
  "COTE D'IVOIRE": "Côte d'Ivoire",
  "CÔTE D'IVOIRE": "Côte d'Ivoire",
  "COTE D’IVOIRE": "Côte d'Ivoire",
  "CÔTE D’IVOIRE": "Côte d'Ivoire",
};

/**
 * Normalizes a country string safely without inventing values for unknown entries.
 */
export function normalizeCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  const trimmed = country.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (COUNTRY_SYNONYMS[upper]) {
    return COUNTRY_SYNONYMS[upper];
  }

  // Preserve original display casing if not matched in synonyms dictionary
  return trimmed;
}

/**
 * Extracts a sorted array of distinct normalized countries from a set of offers.
 */
export function extractOfferCountries(offers: Array<{ country?: string | null }>): string[] {
  const set = new Set<string>();
  for (const offer of offers) {
    const normalized = normalizeCountry(offer.country);
    if (normalized) {
      set.add(normalized);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

/**
 * Checks whether an offer's country matches the requested filter country.
 */
export function matchOfferCountry(
  offerCountry: string | null | undefined,
  filterCountry: string | null | undefined
): boolean {
  if (!filterCountry || !filterCountry.trim()) return true;

  const normalizedOfferCountry = normalizeCountry(offerCountry);
  const normalizedFilterCountry = normalizeCountry(filterCountry);

  if (!normalizedOfferCountry || !normalizedFilterCountry) return false;

  return (
    normalizedOfferCountry.localeCompare(normalizedFilterCountry, "fr", { sensitivity: "base" }) === 0
  );
}
