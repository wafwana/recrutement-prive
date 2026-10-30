export type PublicCompanyIdentity = {
  siren?: string;
  siret?: string;
  name?: string;
  legalForm?: string;
  apeCode?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  website?: string;
  contactEmail?: string;
  sourceType: "API_RECHERCHE_ENTREPRISES";
  sourceUrl: string;
  collectedAt: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizeSiret(value: string): string {
  return value.replace(/\D/g, "");
}

function toCompanyIdentity(result: Record<string, unknown>, sourceUrl: string, requestedSiret?: string): PublicCompanyIdentity {
  const siege = asRecord(result.siege);
  const adresse = asRecord(siege?.adresse);
  const addressParts = [
    text(adresse?.numero_voie),
    text(adresse?.type_voie),
    text(adresse?.libelle_voie),
  ].filter(Boolean);

  return {
    siren: text(result.siren),
    siret: requestedSiret || text(siege?.siret) || text(result.siret),
    name: text(result.nom_complet ?? result.nom_raison_sociale ?? result.denomination),
    legalForm: text(result.nature_juridique),
    apeCode: text(siege?.activite_principale ?? result.activite_principale),
    address: addressParts.length ? addressParts.join(" ") : text(adresse?.l_adresse),
    postalCode: text(adresse?.code_postal),
    city: text(adresse?.libelle_commune),
    country: "France",
    website: text(result.site_web),
    contactEmail: text(result.email) ?? text(siege?.email),
    sourceType: "API_RECHERCHE_ENTREPRISES",
    sourceUrl,
    collectedAt: new Date().toISOString(),
  };
}

async function searchPublicCompanies(identifier: string): Promise<{ results: Record<string, unknown>[]; sourceUrl: string }> {
  const sourceUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(identifier)}`;
  const response = await fetch(sourceUrl, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Service public entreprises indisponible (HTTP ${response.status}).`);

  const payload = asRecord(await response.json());
  const results = (Array.isArray(payload?.results) ? payload.results : [])
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => item !== null);
  return { results, sourceUrl };
}

export async function lookupCompanyBySiret(rawSiret: string): Promise<PublicCompanyIdentity | null> {
  const siret = normalizeSiret(rawSiret);
  if (!/^\d{14}$/.test(siret)) return null;

  const { results, sourceUrl } = await searchPublicCompanies(siret);
  const result = results.find((item) => text(item.siret) === siret || text(asRecord(item.siege)?.siret) === siret);
  if (!result) return null;
  return toCompanyIdentity(result, sourceUrl, siret);
}

export async function lookupCompanyBySiren(rawSiren: string): Promise<PublicCompanyIdentity | null> {
  const siren = normalizeSiret(rawSiren);
  if (!/^\d{9}$/.test(siren)) return null;

  const { results, sourceUrl } = await searchPublicCompanies(siren);
  const result = results.find((item) => text(item.siren) === siren);
  if (!result) return null;

  const company = toCompanyIdentity(result, sourceUrl);
  if (company.siren !== siren || !company.siret || !/^\d{14}$/.test(company.siret)) return null;
  return company;
}
