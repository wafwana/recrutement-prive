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

export async function lookupCompanyBySiret(rawSiret: string): Promise<PublicCompanyIdentity | null> {
  const siret = normalizeSiret(rawSiret);
  if (!/^\d{14}$/.test(siret)) return null;

  const sourceUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siret)}`;
  const response = await fetch(sourceUrl, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Service public entreprises indisponible (HTTP ${response.status}).`);

  const payload = asRecord(await response.json());
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const result = results
    .map(asRecord)
    .find((item) => text(item?.siret) === siret || text(asRecord(item?.siege)?.siret) === siret);

  if (!result) return null;

  const siege = asRecord(result.siege);
  const adresse = asRecord(siege?.adresse);
  const addressParts = [
    text(adresse?.numero_voie),
    text(adresse?.type_voie),
    text(adresse?.libelle_voie),
  ].filter(Boolean);

  return {
    siren: text(result.siren),
    siret,
    name: text(result.nom_complet ?? result.nom_raison_sociale ?? result.denomination),
    legalForm: text(result.nature_juridique),
    apeCode: text(siege?.activite_principale ?? result.activite_principale),
    address: addressParts.length ? addressParts.join(" ") : text(adresse?.l_adresse),
    postalCode: text(adresse?.code_postal),
    city: text(adresse?.libelle_commune),
    country: "France",
    website: text(result.site_web),
    sourceType: "API_RECHERCHE_ENTREPRISES",
    sourceUrl,
    collectedAt: new Date().toISOString(),
  };
}
